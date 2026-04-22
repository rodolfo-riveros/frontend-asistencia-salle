
"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, Search, Save, Sparkles, UserCheck, UserX, Clock, MessageSquareQuote, 
  Loader2, RefreshCcw, PieChart as PieIcon, BarChart3, AlertTriangle, CheckCircle2,
  FileSpreadsheet, FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { aiAttendanceInsights, type AttendanceInsightsOutput } from "@/ai/flows/ai-attendance-insights"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { api } from "@/lib/api"
import { getInitials } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const STATUS_MAP: Record<string, string> = { 'Presente': 'P', 'Falta': 'F', 'Tarde': 'T', 'Justificado': 'J' }
const REVERSE_MAP: Record<string, string> = { 'P': 'Presente', 'F': 'Falta', 'T': 'Tarde', 'J': 'Justificado' }
const COLORS = { Presente: '#10b981', Falta: '#ef4444', Tarde: '#f59e0b', Justificado: '#3b82f6' }

export default function AttendancePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const periodoId = searchParams.get('periodo_id')

  const [students, setStudents] = React.useState<any[]>([])
  const [attendance, setAttendance] = React.useState<Record<string, string | null>>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [date, setDate] = React.useState(() => {
    const now = new Date();
    return new Date(now.getTime() - (5 * 60 * 60 * 1000)).toISOString().split('T')[0];
  })
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<AttendanceInsightsOutput | null>(null)
  const [availableDates, setAvailableDates] = React.useState<string[]>([])
  
  const [isExportingExcel, setIsExportingExcel] = React.useState(false)
  const [isExportingPdf, setIsExportingPdf] = React.useState(false)
  const [courseInfo, setCourseInfo] = React.useState<any>(null)
  const [userName, setUserName] = React.useState("")

  const fetchAvailableDates = React.useCallback(async () => {
    if (!params.id) return
    try {
      const allRecords = await api.get<any[]>(`/asistencias/reporte/unidad/${params.id}`)
      const dates = [...new Set(allRecords.map(r => r.fecha))].sort().reverse()
      setAvailableDates(dates)
    } catch (err) {
      console.error("Error fetching dates:", err)
    }
  }, [params.id])

  const fetchExistingAttendance = React.useCallback(async (studentList: any[], selectedDate?: string) => {
    const queryDate = selectedDate || date
    if (!params.id || !queryDate || studentList.length === 0) return
    
    setIsSyncing(true)
    try {
      const existing = await api.get<any[]>(`/asistencias/reporte/unidad/${params.id}?fecha_inicio=${queryDate}&fecha_fin=${queryDate}`)
      
      const mapped: Record<string, string | null> = {}
      studentList.forEach(s => mapped[s.id] = null)
      
      if (existing && Array.isArray(existing)) {
        existing.forEach(reg => {
          const idAlumno = reg.alumno_id
          if (idAlumno && mapped[idAlumno] !== undefined) {
            const estadoTexto = REVERSE_MAP[reg.estado] || reg.estado
            mapped[idAlumno] = estadoTexto
          }
        })
      }
      setAttendance(mapped)
    } catch (err) {
      console.error("Error al cargar asistencia previa:", err)
    } finally {
      setIsSyncing(false)
    }
  }, [params.id, date])

  const fetchStudents = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const [studentData, assignments, userData] = await Promise.all([
        api.get<any[]>(`/me/unidades/${params.id}/alumnos`),
        api.get<any[]>(`/me/asignaciones/?periodo_id=${periodoId}`),
        supabase.auth.getUser()
      ])

      if (userData.data.user?.user_metadata?.firstname) {
        setUserName(`${userData.data.user.user_metadata.firstname} ${userData.data.user.user_metadata.lastname || ""}`.trim().toUpperCase())
      }

      setStudents(studentData)
      const info = assignments.find((asg: any) => asg.unidad_id === params.id)
      setCourseInfo(info)

      await fetchAvailableDates()
      await fetchExistingAttendance(studentData, date)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: "Fallo al cargar la información del curso." })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, periodoId, fetchExistingAttendance, fetchAvailableDates, date])

  React.useEffect(() => { 
    fetchStudents() 
  }, [fetchStudents])

  React.useEffect(() => {
    if (students.length > 0) {
      fetchExistingAttendance(students, date)
    }
  }, [date, students, fetchExistingAttendance])

  const handleStatus = (id: string, status: string) => setAttendance(p => ({ ...p, [id]: status }))
  
  const handleMassive = (status: string) => {
    const next = { ...attendance }; 
    students.forEach(s => next[s.id] = status); 
    setAttendance(next)
    toast({ title: "Marcado Grupal", description: `Se ha marcado a todos como ${status}.` })
  }

  const handleSave = async () => {
    const records = Object.entries(attendance).filter(([_, st]) => st !== null);
    if (!records.length) return toast({ variant: "destructive", title: "Sin cambios", description: "No has marcado ningún estado." })
    
    const payload = {
      unidad_id: params.id as string, 
      periodo_id: periodoId, 
      fecha: date,
      registros: records.map(([id, st]) => ({ 
        alumno_id: id, 
        estado: STATUS_MAP[st as string] || st 
      }))
    }

    try {
      await api.post('/asistencias/pase-lista', payload)
      toast({ title: "¡Éxito!", description: "La asistencia se ha guardado correctamente." })
      await fetchExistingAttendance(students, date)
      await fetchAvailableDates()
    } catch (err: any) { 
      toast({ variant: "destructive", title: "Error al guardar", description: err.message }) 
    }
  }

  const handleExportExcel = async () => {
    if (!courseInfo) return
    setIsExportingExcel(true)
    toast({ title: "Generando Excel", description: "Preparando reporte de asistencia..." })

    try {
      const reportData = await api.get<any[]>(`/asistencias/reporte/unidad/${params.id}`)
      const uniqueDates = Array.from(new Set(reportData.map(r => r.fecha))).sort()
      const matrix: Record<string, Record<string, string>> = {}
      reportData.forEach(reg => {
        const idAlumno = reg.alumno_id;
        if (idAlumno) {
          if (!matrix[idAlumno]) matrix[idAlumno] = {}
          matrix[idAlumno][reg.fecha] = reg.estado
        }
      })

      const rows: any[] = []
      rows.push(["INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA"])
      rows.push(["REPORTE OFICIAL DE ASISTENCIA ACADÉMICA"])
      rows.push([])
      rows.push(["PROGRAMA PROFESIONAL:", courseInfo.programa_nombre.toUpperCase()])
      rows.push(["UNIDAD DIDÁCTICA:", courseInfo.unidad_nombre.toUpperCase(), "", "SEMESTRE:", courseInfo.semestre])
      rows.push(["DOCENTE RESPONSABLE:", userName, "", "FECHA EMISIÓN:", new Date().toLocaleDateString()])
      rows.push([])
      
      const headerRow = ['N°', 'APELLIDOS Y NOMBRES', 'DNI']
      uniqueDates.forEach(d => {
        const [_, month, day] = d.split('-')
        headerRow.push(`${day}/${month}`)
      })
      headerRow.push('FALTAS', '%')
      rows.push(headerRow)

      students.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach((alumno, index) => {
        let absences = 0
        const attendanceByDate: any[] = []
        uniqueDates.forEach(date => {
          const status = matrix[alumno.id]?.[date] || "-"
          attendanceByDate.push(status)
          if (status === 'F') absences++
        })
        const pct = uniqueDates.length > 0 ? ((absences / uniqueDates.length) * 100).toFixed(1) : "0"
        rows.push([
          (index + 1).toString().padStart(2, '0'),
          alumno.nombre.toUpperCase(),
          alumno.dni,
          ...attendanceByDate,
          absences,
          `${pct}%`
        ])
      })

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, "Asistencia")
      XLSX.writeFile(wb, `REPORTE_${courseInfo.unidad_nombre.replace(/\s+/g, '_')}.xlsx`)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el reporte." })
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    if (!courseInfo) return
    setIsExportingPdf(true)
    toast({ title: "Generando PDF", description: "Preparando reporte oficial..." })

    try {
      const reportData = await api.get<any[]>(`/asistencias/reporte/unidad/${params.id}`)
      const uniqueDates = Array.from(new Set(reportData.map(r => r.fecha))).sort()
      const matrix: Record<string, Record<string, string>> = {}
      reportData.forEach(reg => {
        const idAlumno = reg.alumno_id;
        if (idAlumno) {
          if (!matrix[idAlumno]) matrix[idAlumno] = {}
          matrix[idAlumno][reg.fecha] = reg.estado
        }
      })

      const doc = new jsPDF('l', 'mm', 'a4')
      doc.setFontSize(16); doc.setTextColor(0, 51, 102)
      doc.text("INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA", 14, 15)
      
      doc.setFontSize(10); doc.setTextColor(0)
      doc.text(`UD: ${courseInfo.unidad_nombre.toUpperCase()} | PROGRAMA: ${courseInfo.programa_nombre.toUpperCase()} | DOCENTE: ${userName}`, 14, 25)

      const headers = ['N°', 'ALUMNO', ...uniqueDates.map(d => {
        const [_, m, d] = d.split('-')
        return `${d}/${m}`
      }), 'FALTAS', '%']

      const body = students.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((alumno, index) => {
        const row = [(index + 1).toString().padStart(2, '0'), alumno.nombre.toUpperCase()]
        let absences = 0
        uniqueDates.forEach(date => {
          const status = matrix[alumno.id]?.[date] || "-"
          row.push(status)
          if (status === 'F') absences++
        })
        const pct = uniqueDates.length > 0 ? ((absences / uniqueDates.length) * 100).toFixed(1) : "0"
        row.push(absences, `${pct}%`)
        return row
      })

      autoTable(doc, {
        head: [headers],
        body: body,
        startY: 35,
        styles: { fontSize: 7, cellPadding: 2, halign: 'center' },
        headStyles: { fillColor: [0, 51, 102] },
        columnStyles: { 1: { halign: 'left', fontStyle: 'bold', cellWidth: 50 } },
        theme: 'grid'
      })

      doc.save(`MATRIZ_${courseInfo.unidad_nombre.replace(/\s+/g, '_')}.pdf`)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: "Fallo al generar el PDF." })
    } finally {
      setIsExportingPdf(false)
    }
  }

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const history = await api.get<any[]>(`/asistencias/reporte/unidad/${params.id}`)
      const records = (history || []).map(h => ({
        studentId: h.alumno_id,
        studentName: h.alumno,
        courseUnitId: params.id as string,
        courseUnitName: "Unidad Didáctica",
        date: h.fecha,
        status: REVERSE_MAP[h.estado] || h.estado
      }))
      const result = await aiAttendanceInsights({ attendanceRecords: records as any })
      setAiResult(result); 
      toast({ title: "Análisis IA Finalizado", description: "Se han identificado riesgos y advertencias." })
    } catch (e) { 
      toast({ variant: "destructive", title: "Sin Datos Históricos", description: "No hay suficiente información para un análisis estratégico." }) 
    } finally { 
      setIsAnalyzing(false) 
    }
  }

  const statsData = React.useMemo(() => {
    const counts = { Presente: 0, Falta: 0, Tarde: 0, Justificado: 0 }
    Object.values(attendance).forEach(v => { if (v) counts[v as keyof typeof counts]++ })
    return Object.entries(counts).map(([name, value]) => ({ 
      name, 
      value, 
      fill: COLORS[name as keyof typeof COLORS] 
    })).filter(d => d.value > 0)
  }, [attendance])

  const filtered = students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  const hasRecordsForCurrentDate = availableDates.includes(date)

  return (
    <div className="space-y-10 pb-24">
      <HeaderSection 
        date={date} 
        setDate={setDate} 
        isSyncing={isSyncing} 
        onBack={() => router.back()} 
        onRunAi={runAnalysis} 
        isAnalyzing={isAnalyzing} 
        onSave={handleSave}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        isExportingExcel={isExportingExcel}
        isExportingPdf={isExportingPdf}
        hasRecords={hasRecordsForCurrentDate}
        availableDates={availableDates}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AttendanceTable 
            isLoading={isLoading} 
            filteredStudents={filtered} 
            attendance={attendance} 
            onStatusChange={handleStatus} 
            onMassiveMark={handleMassive} 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
          />
        </div>

        <div className="space-y-8">
          <StatsPanel statsData={statsData} />
        </div>
      </div>

      {aiResult && <AiInsightsPanel aiResult={aiResult} />}
    </div>
  )
}

function HeaderSection({ 
  date, setDate, isSyncing, onBack, onRunAi, isAnalyzing, onSave, 
  onExportExcel, onExportPdf, isExportingExcel, isExportingPdf,
  hasRecords, availableDates 
}: any) {
  return (
    <div className="space-y-8">
      <Button variant="ghost" onClick={onBack} className="h-10 text-primary font-bold hover:bg-primary/5">
        <ArrowLeft className="mr-2 h-4 w-4" /> PANEL PRINCIPAL
      </Button>
      <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
        <div className="space-y-4">
          <h2 className="text-4xl md:text-6xl font-headline font-black tracking-tighter text-slate-900 leading-tight">
            Pase de Lista
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border shadow-sm w-fit">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">FECHA ACADÉMICA:</Label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="bg-transparent border-none font-black text-slate-900 text-sm outline-none cursor-pointer" 
              />
              {isSyncing && <RefreshCcw className="h-4 w-4 animate-spin text-primary" />}
            </div>
            {availableDates.length > 0 && !hasRecords && (
              <div className="text-[10px] text-amber-600 bg-amber-50 px-4 py-2 rounded-xl flex items-center gap-2 font-bold uppercase tracking-widest">
                <AlertTriangle className="h-3 w-3" />
                Sin registros hoy. Fechas con datos: {availableDates.slice(0, 3).join(", ")}
              </div>
            )}
            {hasRecords && (
              <div className="text-[10px] text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl flex items-center gap-2 font-bold uppercase tracking-widest">
                <CheckCircle2 className="h-3 w-3" />
                Asistencia recuperada para esta fecha
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex gap-2">
            <Button variant="outline" className="h-14 px-5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-black uppercase text-[10px] tracking-widest" onClick={onExportExcel} disabled={isExportingExcel}>
              {isExportingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} EXCEL
            </Button>
            <Button variant="outline" className="h-14 px-5 border-red-200 text-red-700 hover:bg-red-50 font-black uppercase text-[10px] tracking-widest" onClick={onExportPdf} disabled={isExportingPdf}>
              {isExportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PDF
            </Button>
          </div>
          <Button variant="outline" className="flex-1 h-14 px-6 gap-3 text-accent border-accent/20 font-black uppercase tracking-widest text-[10px]" onClick={onRunAi} disabled={isAnalyzing}>
            <Sparkles className={`h-5 w-5 ${isAnalyzing ? 'animate-spin' : ''}`} /> DIAGNÓSTICO IA
          </Button>
          <Button className="flex-1 h-14 px-8 gap-3 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90" onClick={onSave}>
            <Save className="h-5 w-5" /> GUARDAR
          </Button>
        </div>
      </div>
    </div>
  )
}

function AttendanceTable({ isLoading, filteredStudents, attendance, onStatusChange, onMassiveMark, searchTerm, setSearchTerm }: any) {
  return (
    <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-3xl">
      <div className="p-8 bg-slate-50/80 border-b flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="h-10 px-4 border-green-200 text-green-700 font-black text-[10px] uppercase tracking-widest" onClick={() => onMassiveMark('Presente')}>P TODOS</Button>
          <Button variant="outline" size="sm" className="h-10 px-4 border-amber-200 text-amber-700 font-black text-[10px] uppercase tracking-widest" onClick={() => onMassiveMark('Tarde')}>T TODOS</Button>
          <Button variant="outline" size="sm" className="h-10 px-4 border-red-200 text-red-700 font-black text-[10px] uppercase tracking-widest" onClick={() => onMassiveMark('Falta')}>F TODOS</Button>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Filtrar por apellidos..." 
            className="pl-12 h-12 border-none rounded-2xl bg-white shadow-inner font-medium" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-32 text-center flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
            <p className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Cargando Estudiantes...</p>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none">
                  <TableHead className="w-[100px] pl-10 font-black text-[10px] uppercase text-slate-400 tracking-widest">ID</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Apellidos y Nombres</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest">Estado</TableHead>
                  <TableHead className="text-right pr-10 font-black text-[10px] uppercase text-slate-400 tracking-widest">Calificar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((s: any) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/30 border-slate-50 group transition-all">
                    <TableCell className="pl-10 py-6">
                      <Avatar className="h-11 w-11 border-2 border-white shadow-md ring-primary/5 transition-all group-hover:ring-primary/20">
                        <AvatarFallback className="bg-primary/5 text-primary font-black text-xs uppercase">{getInitials(s.nombre)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-sm text-slate-800 uppercase tracking-tight">{s.nombre}</div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-1">DNI: {s.dni}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      {attendance[s.id] ? (
                        <Badge className={`uppercase text-[9px] font-black tracking-[0.15em] px-4 py-1.5 border-none shadow-sm ${
                          attendance[s.id] === 'Presente' ? 'bg-emerald-100 text-emerald-700' : 
                          attendance[s.id] === 'Falta' ? 'bg-red-100 text-red-700' : 
                          attendance[s.id] === 'Tarde' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>{attendance[s.id]}</Badge>
                      ) : <Badge variant="outline" className="text-slate-300 text-[9px] uppercase font-black tracking-widest bg-slate-25">PENDIENTE</Badge>}
                    </TableCell>
                    <TableCell className="text-right pr-10">
                      <div className="flex justify-end gap-2">
                        <ActionBtn icon={UserCheck} active={attendance[s.id] === 'Presente'} color="green" onClick={() => onStatusChange(s.id, 'Presente')} />
                        <ActionBtn icon={Clock} active={attendance[s.id] === 'Tarde'} color="amber" onClick={() => onStatusChange(s.id, 'Tarde')} />
                        <ActionBtn icon={UserX} active={attendance[s.id] === 'Falta'} color="red" onClick={() => onStatusChange(s.id, 'Falta')} />
                        <ActionBtn icon={MessageSquareQuote} active={attendance[s.id] === 'Justificado'} color="blue" onClick={() => onStatusChange(s.id, 'Justificado')} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function StatsPanel({ statsData }: any) {
  return (
    <div className="space-y-8">
      <Card className="border-none shadow-xl bg-white p-8 rounded-3xl">
        <CardHeader className="p-0 pb-6">
          <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-3"><PieIcon className="h-5 w-5 text-primary" /> Distribución Hoy</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={statsData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={90} 
                  paddingAngle={8} 
                  dataKey="value"
                >
                  {statsData.map((e: any, i: any) => <Cell key={i} fill={e.fill} stroke="none" />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            {statsData.map((it: any, i: any) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: it.fill }} />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{it.name}</span>
                  <span className="text-sm font-black text-slate-900">{it.value}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl bg-white p-8 rounded-3xl">
        <CardHeader className="p-0 pb-6">
          <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-3"><BarChart3 className="h-5 w-5 text-indigo-500" /> Comparativa</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsData}>
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statsData.map((e: any, i: any) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AiInsightsPanel({ aiResult }: any) {
  return (
    <Card className="border-none shadow-2xl bg-slate-900 text-white p-10 rounded-[3rem] animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-yellow-400/10 rounded-2xl">
            <Sparkles className="h-8 w-8 text-yellow-400" />
          </div>
          <h3 className="text-3xl font-black uppercase tracking-tighter italic">Diagnóstico Estratégico</h3>
        </div>
        <Badge className="bg-white/10 text-white/60 border-white/10 font-mono text-[10px]">VERSIÓN FLASH 2.5</Badge>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-16">
        <div className="space-y-12">
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em]">Resumen Ejecutivo</Label>
            <p className="text-xl text-blue-50/90 leading-relaxed font-medium">{aiResult.summary}</p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <UserX className="h-6 w-6 text-red-500" />
              <Label className="text-[11px] font-black uppercase text-red-400 tracking-[0.2em]">Alerta: Riesgo de Deserción (≥ 30% Faltas)</Label>
            </div>
            {aiResult.atRiskStudents.length > 0 ? (
              <div className="grid gap-3">
                {aiResult.atRiskStudents.map((st: any, i: any) => (
                  <div key={i} className="bg-red-500/5 border border-red-500/10 p-5 rounded-2xl flex items-center justify-between group hover:bg-red-500/10 transition-all">
                    <div>
                      <p className="font-black text-lg text-red-50 uppercase">{st.name}</p>
                      <p className="text-xs text-red-200/50 mt-1 font-medium italic">{st.reason}</p>
                    </div>
                    <Badge className="bg-red-600 font-black px-4 py-1">{st.absencePercentage}%</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-emerald-400/60 font-bold uppercase tracking-widest px-4 py-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 w-fit">✓ No se detectan riesgos críticos</p>}
          </div>
        </div>

        <div className="space-y-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <Label className="text-[11px] font-black uppercase text-amber-400 tracking-[0.2em]">Advertencia Temprana: Tardanzas</Label>
            </div>
            {aiResult.warningStudents.length > 0 ? (
              <div className="grid gap-4">
                {aiResult.warningStudents.map((st: any, i: any) => (
                  <div key={i} className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-lg text-amber-50 uppercase">{st.name}</p>
                      <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px] px-3 font-black">{st.tardyCount} Tardanzas</Badge>
                    </div>
                    <div className="p-5 bg-white/5 rounded-2xl text-[12px] text-white/80 leading-relaxed border border-white/5">
                      <span className="text-amber-400 font-black uppercase text-[9px] block mb-2 tracking-widest">Sugerencia Pedagógica:</span>
                      {st.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-emerald-400/60 font-bold uppercase tracking-widest px-4 py-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 w-fit">✓ Patrones de puntualidad estables</p>}
          </div>
          
          <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 space-y-6">
            <Label className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.3em]">Hoja de Ruta del Docente</Label>
            <ul className="space-y-4">
              {aiResult.recommendations.map((r: any, i: any) => (
                <li key={i} className="flex gap-4 text-[13px] text-blue-50/80 items-start">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="font-black text-emerald-500 text-[10px]">✓</span>
                  </div>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  )
}

function ActionBtn({ icon: Icon, active, color, onClick }: any) {
  const styles: any = {
    green: active ? "bg-emerald-600 text-white scale-110 shadow-lg shadow-emerald-200" : "text-slate-300 hover:text-emerald-600 hover:bg-emerald-50",
    amber: active ? "bg-amber-500 text-white scale-110 shadow-lg shadow-amber-200" : "text-slate-300 hover:text-amber-600 hover:bg-amber-50",
    red: active ? "bg-red-600 text-white scale-110 shadow-lg shadow-red-200" : "text-slate-300 hover:text-red-600 hover:bg-red-50",
    blue: active ? "bg-blue-600 text-white scale-110 shadow-lg shadow-blue-200" : "text-slate-300 hover:text-blue-600 hover:bg-blue-50",
  }
  return (
    <Button 
      size="icon" 
      variant="outline" 
      onClick={onClick} 
      className={`h-11 w-11 rounded-2xl border-slate-100 transition-all duration-300 ${styles[color]}`}
    >
      <Icon className="h-5 w-5" />
    </Button>
  )
}
