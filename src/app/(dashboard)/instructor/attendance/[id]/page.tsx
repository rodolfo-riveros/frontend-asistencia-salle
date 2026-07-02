
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

function AttendanceContent() {
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
        const dateParts = d.split('-')
        headerRow.push(`${dateParts[2]}/${dateParts[1]}`)
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
      
      doc.setFontSize(16); doc.setTextColor(0, 51, 102); doc.setFont("helvetica", "bold")
      doc.text("INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA", 14, 15)
      
      doc.setFontSize(9); doc.setTextColor(100); doc.setFont("helvetica", "bold")
      doc.text("REPORTE OFICIAL DE ASISTENCIA ACADÉMICA", 14, 22)
      
      doc.setFontSize(8); doc.setTextColor(0); doc.setFont("helvetica", "normal")
      doc.text("UNIDAD DIDÁCTICA:", 14, 30); doc.setFont("helvetica", "bold")
      doc.text(`${courseInfo.unidad_nombre.toUpperCase()}`, 45, 30)
      
      doc.setFont("helvetica", "normal")
      doc.text("PROGRAMA PROFESIONAL:", 14, 35); doc.setFont("helvetica", "bold")
      doc.text(`${courseInfo.programa_nombre.toUpperCase()}`, 55, 35)
      
      doc.setFont("helvetica", "normal")
      doc.text("DOCENTE RESPONSABLE:", 14, 40); doc.setFont("helvetica", "bold")
      doc.text(`${userName}`, 55, 40)
      
      doc.setFont("helvetica", "normal")
      doc.text("SEMESTRE ACADÉMICO:", 230, 30); doc.setFont("helvetica", "bold")
      doc.text(`${courseInfo.semestre}`, 270, 30)
      
      doc.setFont("helvetica", "normal")
      doc.text("FECHA DE EMISIÓN:", 230, 35); doc.setFont("helvetica", "bold")
      doc.text(`${new Date().toLocaleDateString()}`, 265, 35)

      const headers = ['N°', 'APELLIDOS Y NOMBRES', ...uniqueDates.map(dateStr => {
        const parts = dateStr.split('-')
        return `${parts[2]}/${parts[1]}`
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
        startY: 48,
        styles: { fontSize: 7, cellPadding: 2, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'left', fontStyle: 'bold', cellWidth: 60 } },
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: [0, 1],
        theme: 'grid'
      })

      doc.save(`MATRIZ_ASISTENCIA_${courseInfo.unidad_nombre.replace(/\s+/g, '_')}.pdf`)
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
      if (!history || history.length === 0) {
        toast({ variant: "destructive", title: "Sin Datos", description: "No hay registros de asistencia para analizar." })
        setIsAnalyzing(false); return
      }
      const nameMap = Object.fromEntries(students.map((s: any) => [s.id, s.nombre]))
      const records = history.map(h => ({
        studentId: h.alumno_id,
        studentName: nameMap[h.alumno_id] || h.alumno || "ALUMNO",
        courseUnitId: params.id as string,
        courseUnitName: "Unidad Didáctica",
        date: h.fecha,
        status: REVERSE_MAP[h.estado] || h.estado
      }))
      const result = await aiAttendanceInsights({ attendanceRecords: records as any })
      setAiResult(result)
      generateDiagnosticPdf(result, courseInfo?.unidad_nombre || "Unidad Didáctica", students as any[])
      toast({ title: "Análisis IA Finalizado", description: "El diagnóstico PDF se ha descargado." })
    } catch (e) {
      console.error("AI Analysis error:", e)
      toast({ variant: "destructive", title: "Error de IA", description: "Ocurrió un error al generar el diagnóstico. Verifica la conexión con Genkit." })
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

      {aiResult && <></>}
    </div>
  )
}

export default function AttendancePage() {
  return (
    <React.Suspense fallback={<div className="h-screen flex flex-col items-center justify-center gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Cargando Registro de Asistencia...</p></div>}>
      <AttendanceContent />
    </React.Suspense>
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
          <h2 className="text-4xl md:text-6xl font-headline font-black tracking-tighter text-foreground leading-tight">
            Pase de Lista
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4 bg-card px-6 py-3 rounded-2xl border shadow-sm w-fit">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">FECHA ACADÉMICA:</Label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="bg-transparent border-none font-black text-foreground text-sm outline-none cursor-pointer" 
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
    <Card className="border-none shadow-2xl overflow-hidden bg-card rounded-3xl">
      <div className="p-8 bg-muted/50 border-b flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="h-10 px-4 border-green-200 text-green-700 font-black text-[10px] uppercase tracking-widest" onClick={() => onMassiveMark('Presente')}>P TODOS</Button>
          <Button variant="outline" size="sm" className="h-10 px-4 border-amber-200 text-amber-700 font-black text-[10px] uppercase tracking-widest" onClick={() => onMassiveMark('Tarde')}>T TODOS</Button>
          <Button variant="outline" size="sm" className="h-10 px-4 border-red-200 text-red-700 font-black text-[10px] uppercase tracking-widest" onClick={() => onMassiveMark('Falta')}>F TODOS</Button>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Filtrar por apellidos..." 
            className="pl-12 h-12 border-none rounded-2xl bg-card shadow-inner font-medium" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-32 text-center flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
            <p className="font-black text-[10px] uppercase text-muted-foreground tracking-widest">Cargando Estudiantes...</p>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-none">
                  <TableHead className="w-[100px] pl-10 font-black text-[10px] uppercase text-muted-foreground tracking-widest">ID</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-muted-foreground tracking-widest">Apellidos y Nombres</TableHead>
                  <TableHead className="text-center font-black text-[10px] uppercase text-muted-foreground tracking-widest">Estado</TableHead>
                  <TableHead className="text-right pr-10 font-black text-[10px] uppercase text-muted-foreground tracking-widest">Calificar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((s: any) => (
                  <TableRow key={s.id} className="hover:bg-muted/30 border-border group transition-all">
                    <TableCell className="pl-10 py-6">
                      <Avatar className="h-11 w-11 border-2 border-border shadow-md ring-primary/5 transition-all group-hover:ring-primary/20">
                        <AvatarFallback className="bg-primary/5 text-primary font-black text-xs uppercase">{getInitials(s.nombre)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-sm text-foreground uppercase tracking-tight">{s.nombre}</div>
                      <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-1">DNI: {s.dni}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      {attendance[s.id] ? (
                        <Badge className={`uppercase text-[9px] font-black tracking-[0.15em] px-4 py-1.5 border-none shadow-sm ${
                          attendance[s.id] === 'Presente' ? 'bg-emerald-100 text-emerald-700' : 
                          attendance[s.id] === 'Falta' ? 'bg-red-100 text-red-700' : 
                          attendance[s.id] === 'Tarde' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>{attendance[s.id]}</Badge>
                      ) : <Badge variant="secondary" className="text-muted-foreground/60 text-[9px] uppercase font-black tracking-widest">PENDIENTE</Badge>}
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
      <Card className="border-none shadow-xl bg-card p-8 rounded-3xl">
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
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: it.fill }} />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{it.name}</span>
                  <span className="text-sm font-black text-foreground">{it.value}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl bg-card p-8 rounded-3xl">
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

function generateDiagnosticPdf(data: AttendanceInsightsOutput, courseName: string, allStudents: any[]) {
  const doc = new jsPDF("p", "mm", "a4")
  const pageW = 210
  const margin = 20
  const contentW = pageW - margin * 2

  // ---- helper: draw a heat bar ----
  const heatColor = (pct: number): [number, number, number] => {
    if (pct >= 30) return [220, 38, 38]   // red
    if (pct >= 20) return [251, 146, 60]  // orange
    if (pct >= 10) return [250, 204, 21]  // yellow
    return [34, 197, 94]                  // green
  }

  // ---- helper: colored cell ----
  const coloredCell = (text: string, pct: number, opts?: any) => {
    const [r, g, b] = heatColor(pct)
    return { content: text, styles: { fillColor: [r, g, b], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", ...opts } }
  }

  // ============================
  // COVER PAGE
  // ============================
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageW, 297, "F")
  doc.setTextColor(251, 191, 36)
  doc.setFontSize(42)
  doc.setFont("helvetica", "bold")
  doc.text("DIAGNÓSTICO", margin, 80)
  doc.text("ESTRATÉGICO", margin, 118)
  doc.setFontSize(60)
  doc.setTextColor(255, 255, 255)
  doc.text("ASISTENCIA", margin, 168)
  doc.setFontSize(14)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(148, 163, 184)
  doc.text(`Curso: ${courseName}`, margin, 210)
  doc.text(`Generado: ${new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}`, margin, 224)
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)

  // ============================
  // PAGE 2 — SUMMARY
  // ============================
  doc.addPage()
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageW, 40, "F")
  doc.setTextColor(251, 191, 36)
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("RESUMEN EJECUTIVO", margin, 26)
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)

  let y = 58
  doc.setTextColor(55, 65, 81)
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  const summaryLines = doc.splitTextToSize(data.summary, contentW)
  doc.text(summaryLines, margin, y)
  y += summaryLines.length * 6 + 14

  // ---- stats cards ----
  const totalStudents = data.atRiskStudents.length + data.warningStudents.length + (allStudents.length - data.atRiskStudents.length - data.warningStudents.length)
  const cardW = (contentW - 12) / 3
  const statCards = [
    { label: "TOTAL ALUMNOS", value: String(totalStudents), bg: [239, 246, 255], accent: [37, 99, 235] },
    { label: "EN RIESGO", value: String(data.atRiskStudents.length), bg: [254, 242, 242], accent: [220, 38, 38] },
    { label: "CON TARDANZAS", value: String(data.warningStudents.length), bg: [255, 247, 237], accent: [234, 88, 12] },
  ]
  statCards.forEach((card, i) => {
    const x = margin + i * (cardW + 6)
    doc.setFillColor(card.bg[0], card.bg[1], card.bg[2])
    doc.setDrawColor(card.accent[0], card.accent[1], card.accent[2])
    doc.roundedRect(x, y, cardW, 36, 4, 4, "FD")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(card.accent[0], card.accent[1], card.accent[2])
    doc.text(card.label, x + 6, y + 12)
    doc.setFontSize(22)
    doc.setTextColor(30, 41, 59)
    doc.text(card.value, x + 6, y + 30)
  })
  y += 52

  // ============================
  // SECTION 1 — AT-RISK STUDENTS
  // ============================
  doc.setFillColor(239, 68, 68)
  doc.rect(margin, y, 4, 14, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text("ALUMNOS EN RIESGO DE DESERCION (>= 30% INASISTENCIA)", margin + 12, y + 10)
  y += 24

  if (data.atRiskStudents.length > 0) {
    const rows = data.atRiskStudents.map((st: any, i: number) => [
      { content: String(i + 1), styles: { halign: "center", fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" } },
      { content: st.name, styles: { fontStyle: "bold" } },
      { content: `${st.absencePercentage}%`, styles: { halign: "center", fontStyle: "bold", fillColor: [254, 202, 202], textColor: [185, 28, 28] } },
      { content: st.reason, styles: { fontStyle: "italic", textColor: [100, 116, 139] } },
    ])
    autoTable(doc, {
      startY: y,
      head: [[{ content: "#", styles: { halign: "center", fillColor: [239, 68, 68], textColor: [255, 255, 255] } },
              { content: "ALUMNO", styles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] } },
              { content: "% FALTAS", styles: { halign: "center", fillColor: [239, 68, 68], textColor: [255, 255, 255] } },
              { content: "CAUSA PRINCIPAL", styles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] } }]],
      body: rows,
      theme: "grid",
      headStyles: { fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, lineColor: [226, 232, 240], lineWidth: 0.5 },
      columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 60 }, 2: { cellWidth: 24 }, 3: { cellWidth: contentW - 96 } },
      margin: { left: margin, right: margin },
    })
  } else {
    doc.setFillColor(220, 252, 231)
    doc.roundedRect(margin, y, contentW, 20, 4, 4, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(22, 163, 74)
    doc.text("✓ No se detectan alumnos con riesgo crítico de deserción.", margin + 8, y + 13)
  }
  y = (doc as any).lastAutoTable?.finalY || y + 30

  // ---- heatmap visualization ----
  if (data.atRiskStudents.length > 0) {
    y += 12
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text("MAPA DE CALOR — NIVEL DE RIESGO POR ALUMNO", margin, y)
    y += 8

    const barW = contentW / Math.max(data.atRiskStudents.length, 1)
    const barH = 20
    data.atRiskStudents.forEach((st: any, i: number) => {
      const x = margin + i * barW
      const intensity = Math.min(st.absencePercentage / 100, 1)
      const r = Math.round(220 + (185 - 220) * intensity)
      const g = Math.round(38 + (28 - 38) * intensity)
      const b = Math.round(38 + (28 - 38) * intensity)
      doc.setFillColor(r, g, b)
      doc.roundedRect(x, y, Math.max(barW - 2, 8), barH, 2, 2, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(6)
      doc.setTextColor(255, 255, 255)
      doc.text(`${st.absencePercentage}%`, x + 2, y + barH / 2 + 2)
      doc.setFontSize(5)
      doc.text(st.name.length > 12 ? st.name.slice(0, 10) + ".." : st.name, x + 2, y + barH - 3)
    })
    y += barH + 16
  }

  // ============================
  // SECTION 2 — WARNING STUDENTS
  // ============================
  if (y > 230) { doc.addPage(); y = 20 }
  doc.setFillColor(245, 158, 11)
  doc.rect(margin, y, 4, 14, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text("ALUMNOS CON PATRÓN DE TARDANZAS", margin + 12, y + 10)
  y += 24

  if (data.warningStudents.length > 0) {
    const rows = data.warningStudents.map((st: any, i: number) => [
      { content: String(i + 1), styles: { halign: "center", fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" } },
      { content: st.name, styles: { fontStyle: "bold" } },
      { content: `${st.tardyCount}`, styles: { halign: "center", fontStyle: "bold", fillColor: [254, 243, 199], textColor: [146, 64, 14] } },
      { content: st.suggestion, styles: { fontStyle: "italic", textColor: [100, 116, 139] } },
    ])
    autoTable(doc, {
      startY: y,
      head: [[{ content: "#", styles: { halign: "center", fillColor: [245, 158, 11], textColor: [255, 255, 255] } },
              { content: "ALUMNO", styles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] } },
              { content: "TARD.", styles: { halign: "center", fillColor: [245, 158, 11], textColor: [255, 255, 255] } },
              { content: "SUGERENCIA", styles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] } }]],
      body: rows,
      theme: "grid",
      headStyles: { fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, lineColor: [226, 232, 240], lineWidth: 0.5 },
      columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 60 }, 2: { cellWidth: 20 }, 3: { cellWidth: contentW - 92 } },
      margin: { left: margin, right: margin },
    })
  } else {
    doc.setFillColor(220, 252, 231)
    doc.roundedRect(margin, y, contentW, 20, 4, 4, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(22, 163, 74)
    doc.text("✓ Patrones de puntualidad estables. No se requieren intervenciones inmediatas.", margin + 8, y + 13)
  }
  y = (doc as any).lastAutoTable?.finalY || y + 30

  // ============================
  // SECTION 3 — PEDAGOGICAL ADVICE for LATE STUDENTS
  // ============================
  if (data.warningStudents.length > 0) {
    y += 12
    if (y > 230) { doc.addPage(); y = 20 }
    doc.setFillColor(59, 130, 246)
    doc.rect(margin, y, 4, 14, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text("ESTRATEGIAS PEDAGÓGICAS PARA ABORDAR TARDANZAS", margin + 12, y + 10)
    y += 22

    const consejos = [
      "Programa una reunión individual con cada estudiante para entender la causa raíz de sus tardanzas en un ambiente de confianza.",
      "Establece acuerdos de puntualidad con el estudiante, firmando un compromiso escrito con metas semanales alcanzables.",
      "Implementa un sistema de reconocimiento positivo: los estudiantes puntuales durante todo el mes ganan un pase especial.",
      "Comunícate con los padres o apoderados para crear una red de apoyo que refuerce la importancia de la puntualidad.",
      "Ofrece flexibilidad de 5 minutos al inicio de la clase como 'ventana de cortesía', registrando tardanzas solo después de ese margen.",
      "Diseña actividades especialmente atractivas en los primeros 10 minutos de clase para motivar la llegada temprana.",
    ]
    consejos.forEach((c, i) => {
      doc.setFillColor(239, 246, 255)
      doc.roundedRect(margin, y, contentW, 14, 3, 3, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(59, 130, 246)
      doc.text(`${i + 1}.`, margin + 6, y + 9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(71, 85, 105)
      const lines = doc.splitTextToSize(c, contentW - 22)
      doc.text(lines, margin + 14, y + 5)
      y += 15 + (lines.length - 1) * 4
    })
  }

  // ============================
  // SECTION 4 — SPECIFIC SUGGESTIONS FOR EACH LATE STUDENT
  // ============================
  if (data.warningStudents.length > 0) {
    y += 10
    data.warningStudents.forEach((st: any) => {
      if (y > 250) { doc.addPage(); y = 20 }
      doc.setFillColor(255, 247, 237)
      doc.roundedRect(margin, y, contentW, 22, 4, 4, "F")
      doc.setFillColor(245, 158, 11)
      doc.rect(margin, y, 4, 22, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(15, 23, 42)
      doc.text(st.name.toUpperCase(), margin + 12, y + 8)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(107, 114, 128)
      const sugLines = doc.splitTextToSize(st.suggestion, contentW - 20)
      doc.text(sugLines, margin + 12, y + 16)
      y += 30
    })
  }

  // ============================
  // SECTION 5 — RECOMMENDATIONS
  // ============================
  y += 10
  if (y > 220) { doc.addPage(); y = 20 }
  doc.setFillColor(16, 185, 129)
  doc.rect(margin, y, 4, 14, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text("HOJA DE RUTA DEL DOCENTE — RECOMENDACIONES", margin + 12, y + 10)
  y += 22

  data.recommendations.forEach((r: string, i: number) => {
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setFillColor(i % 2 === 0 ? 236 : 240, i % 2 === 0 ? 253 : 253, i % 2 === 0 ? 245 : 244)
    doc.roundedRect(margin, y, contentW, 16, 3, 3, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(16, 185, 129)
    doc.text("→", margin + 6, y + 10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(71, 85, 105)
    const recLines = doc.splitTextToSize(r, contentW - 18)
    doc.text(recLines, margin + 14, y + 6)
    y += 18 + (recLines.length - 1) * 5
  })

  // ============================
  // FOOTER on each page
  // ============================
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(156, 163, 175)
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin - doc.getTextWidth(`Página ${i} de ${pageCount}`), 288)
  }

  doc.save(`DIAGNOSTICO_ASISTENCIA_${courseName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`)
}

function ActionBtn({ icon: Icon, active, color, onClick }: any) {
  const styles: any = {
    green: active ? "bg-emerald-600 text-white scale-110 shadow-lg shadow-emerald-200" : "text-muted-foreground/50 hover:text-emerald-600 hover:bg-emerald-500/10",
    amber: active ? "bg-amber-500 text-white scale-110 shadow-lg shadow-amber-200" : "text-muted-foreground/50 hover:text-amber-600 hover:bg-amber-500/10",
    red: active ? "bg-red-600 text-white scale-110 shadow-lg shadow-red-200" : "text-muted-foreground/50 hover:text-red-600 hover:bg-red-500/10",
    blue: active ? "bg-blue-600 text-white scale-110 shadow-lg shadow-blue-200" : "text-muted-foreground/50 hover:text-blue-600 hover:bg-blue-500/10",
  }
  return (
    <Button 
      size="icon" 
      variant="outline" 
      onClick={onClick} 
      className={`h-11 w-11 rounded-2xl border-border transition-all duration-300 ${styles[color]}`}
    >
      <Icon className="h-5 w-5" />
    </Button>
  )
}
