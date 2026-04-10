
"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  BookOpen, 
  Users, 
  ArrowRight, 
  FileSpreadsheet, 
  FileText, 
  Loader2, 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  CircleDashed, 
  GraduationCap,
  ClipboardCheck,
  ChevronDown,
  LayoutDashboard
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function InstructorDashboard() {
  const [asignaciones, setAsignaciones] = React.useState<any[]>([])
  const [periods, setPeriods] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<string>("")
  const [isExporting, setIsExporting] = React.useState<string | null>(null)
  const [isExportingPdf, setIsExportingPdf] = React.useState<string | null>(null)
  const [userName, setUserName] = React.useState("USUARIO DOCENTE")
  const [attendanceStatus, setAttendanceStatus] = React.useState<Record<string, boolean>>({})

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.firstname) {
        setUserName(`${user.user_metadata.firstname} ${user.user_metadata.lastname || ""}`.trim().toUpperCase())
      }

      const periodData = await api.get<any[]>('/periodos/')
      setPeriods(periodData)
      
      const active = periodData.find((p: any) => p.es_activo)
      const currentId = selectedPeriodId || (active ? active.id : "")
      
      if (!selectedPeriodId && active) {
        setSelectedPeriodId(active.id)
      }

      if (currentId) {
        const data = await api.get<any[]>(`/me/asignaciones/?periodo_id=${currentId}`)
        setAsignaciones(data)
        
        const today = new Date(new Date().getTime() - (5 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const statusMap: Record<string, boolean> = {};
        
        await Promise.all(data.map(async (asg) => {
          try {
            const history = await api.get<any[]>(`/asistencias/reporte/unidad/${asg.unidad_id}?fecha_inicio=${today}&fecha_fin=${today}`)
            statusMap[asg.unidad_id] = history && history.length > 0;
          } catch (e) {
            statusMap[asg.unidad_id] = false;
          }
        }));
        
        setAttendanceStatus(statusMap);
      } else {
        setAsignaciones([])
      }
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error de Sincronización", 
        description: "No se pudo conectar con el servidor." 
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedPeriodId])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExportExcel = async (asg: any) => {
    setIsExporting(asg.id)
    toast({
      title: "Generando Matriz Profesional",
      description: "Construyendo reporte académico de asistencia...",
    })

    try {
      const [reportData, alumnos] = await Promise.all([
        api.get<any[]>(`/asistencias/reporte/unidad/${asg.unidad_id}`).catch(() => []),
        api.get<any[]>(`/me/unidades/${asg.unidad_id}/alumnos`).catch(() => [])
      ])

      if (!alumnos || alumnos.length === 0) {
        throw new Error("No hay alumnos matriculados para generar el reporte.")
      }

      const uniqueDates = Array.from(new Set(reportData.map(r => r.fecha))).sort()
      const matrix: Record<string, Record<string, string>> = {}
      reportData.forEach(reg => {
        const idAlumno = reg.alumno_id || reg.id_alumno;
        if (idAlumno) {
          if (!matrix[idAlumno]) matrix[idAlumno] = {}
          matrix[idAlumno][reg.fecha] = reg.estado
        }
      })

      const periodName = periods.find(p => p.id === selectedPeriodId)?.nombre || "N/A"
      
      const rows: any[] = []
      rows.push(["INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA"])
      rows.push(["REPORTE OFICIAL DE ASISTENCIA ACADÉMICA"])
      rows.push([])
      rows.push(["DATOS DE LA UNIDAD DIDÁCTICA"])
      rows.push(["PROGRAMA PROFESIONAL:", asg.programa_nombre.toUpperCase(), "", "PERIODO ACADÉMICO:", periodName])
      rows.push(["UNIDAD DIDÁCTICA:", asg.unidad_nombre.toUpperCase(), "", "SEMESTRE:", asg.semestre])
      rows.push(["DOCENTE RESPONSABLE:", userName, "", "FECHA DE EMISIÓN:", new Date().toLocaleDateString('es-PE')])
      rows.push([])
      
      const headerRow = ['N°', 'APELLIDOS Y NOMBRES', 'DNI']
      uniqueDates.forEach(d => {
        const [_, month, day] = d.split('-')
        headerRow.push(`${day}/${month}`)
      })
      headerRow.push('TOTAL FALTAS', '% INASISTENCIA')
      rows.push(headerRow)

      const studentData: any[] = []
      alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach((alumno, index) => {
        let absences = 0
        const attendanceByDate: any[] = []
        
        uniqueDates.forEach(date => {
          const status = matrix[alumno.id]?.[date] || "-"
          attendanceByDate.push(status)
          if (status === 'F') absences++
        })

        const totalSessions = uniqueDates.length
        const pct = totalSessions > 0 ? ((absences / totalSessions) * 100).toFixed(1) : "0"

        const studentRow: any[] = [
          (index + 1).toString().padStart(2, '0'),
          alumno.nombre.toUpperCase(),
          alumno.dni || 'S/D',
          ...attendanceByDate,
          absences,
          `${pct}%`
        ]
        rows.push(studentRow)
        studentData.push({ ...alumno, attendanceByDate, absences, pct })
      })

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(rows)

      const wscols = [
        { wch: 5 }, { wch: 45 }, { wch: 12 },
        ...uniqueDates.map(() => ({ wch: 8 })), 
        { wch: 15 }, { wch: 15 }
      ]
      ws['!cols'] = wscols

      const summaryRows: any[] = [
        ["RESUMEN INDIVIDUAL DE ASISTENCIA"],
        [],
        ["N°", "ALUMNO", "DNI", "FALTAS", "% ASISTENCIA", "ESTADO"]
      ]

      studentData.forEach((student, idx) => {
        let estado = "APROBADO"
        if (parseFloat(student.pct) > 30) estado = "DESAPROBADO"
        else if (parseFloat(student.pct) > 15) estado = "OBSERVADO"
        
        summaryRows.push([
          idx + 1,
          student.nombre.toUpperCase(),
          student.dni,
          student.absences,
          `${student.pct}%`,
          estado
        ])
      })

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
      
      XLSX.utils.book_append_sheet(wb, ws, "Matriz de Asistencia")
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Individual")

      XLSX.writeFile(wb, `REPORTE_ASISTENCIA_${asg.unidad_nombre.replace(/\s+/g, '_')}.xlsx`)
      toast({ title: "Reporte Excel Exportado" })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setIsExporting(null)
    }
  }

  const handleExportPdf = async (asg: any) => {
    setIsExportingPdf(asg.id)
    toast({
      title: "Generando PDF Profesional",
      description: "Construyendo reporte académico...",
    })

    try {
      const [reportData, alumnos] = await Promise.all([
        api.get<any[]>(`/asistencias/reporte/unidad/${asg.unidad_id}`).catch(() => []),
        api.get<any[]>(`/me/unidades/${asg.unidad_id}/alumnos`).catch(() => [])
      ])

      if (!alumnos || alumnos.length === 0) throw new Error("No hay alumnos matriculados.")

      const uniqueDates = Array.from(new Set(reportData.map(r => r.fecha))).sort()
      const matrix: Record<string, Record<string, string>> = {}
      reportData.forEach(reg => {
        const idAlumno = reg.alumno_id || reg.id_alumno;
        if (idAlumno) {
          if (!matrix[idAlumno]) matrix[idAlumno] = {}
          matrix[idAlumno][reg.fecha] = reg.estado
        }
      })

      const doc = new jsPDF('l', 'mm', 'a4')
      const periodName = periods.find(p => p.id === selectedPeriodId)?.nombre || "N/A"

      doc.setFontSize(16)
      doc.setTextColor(0, 51, 102)
      doc.text("INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA", 14, 15)
      
      doc.setFontSize(12)
      doc.setTextColor(100)
      doc.text("MATRIZ DE CONTROL DE ASISTENCIA ACADÉMICA", 14, 22)
      
      doc.setFontSize(9)
      doc.setTextColor(0)
      doc.text(`PROGRAMA: ${asg.programa_nombre.toUpperCase()}`, 14, 32)
      doc.text(`UNIDAD DIDÁCTICA: ${asg.unidad_nombre.toUpperCase()}`, 14, 37)
      doc.text(`DOCENTE: ${userName}`, 14, 42)
      
      doc.text(`PERIODO: ${periodName}`, 220, 32)
      doc.text(`SEMESTRE: ${asg.semestre}`, 220, 37)
      doc.text(`FECHA REPORTE: ${new Date().toLocaleDateString()}`, 220, 42)

      const headers = ['N°', 'APELLIDOS Y NOMBRES']
      uniqueDates.forEach(d => {
        const [_, month, day] = d.split('-')
        headers.push(`${day}/${month}`)
      })
      headers.push('FALTAS', '%')

      const body = alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((alumno, index) => {
        const row = [(index + 1).toString().padStart(2, '0'), alumno.nombre.toUpperCase()]
        let absences = 0
        uniqueDates.forEach(date => {
          const status = matrix[alumno.id]?.[date] || "-"
          row.push(status)
          if (status === 'F') absences++
        })
        const totalSessions = uniqueDates.length
        const pct = totalSessions > 0 ? ((absences / totalSessions) * 100).toFixed(1) : "0"
        row.push(absences, `${pct}%`)
        return row
      })

      autoTable(doc, {
        head: [headers],
        body: body,
        startY: 50,
        styles: { fontSize: 7, cellPadding: 1.5, halign: 'center' },
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'left', fontStyle: 'bold', cellWidth: 60 } },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        theme: 'grid'
      })

      doc.save(`MATRIZ_${asg.unidad_nombre.replace(/\s+/g, '_')}.pdf`)
      toast({ title: "PDF Generado con éxito" })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setIsExportingPdf(null)
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-8 bg-primary rounded-full" />
            <span className="text-primary font-bold uppercase tracking-widest text-[10px]">Portal del Docente</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-headline font-black tracking-tighter text-slate-900 leading-tight">
            Gestión de Cursos
          </h2>
        </div>
        
        <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Periodo Actual</span>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="h-9 w-[220px] border-none bg-slate-50 font-bold text-slate-900">
                <Calendar className="h-4 w-4 mr-2 text-primary" />
                <SelectValue placeholder="Seleccione Ciclo" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre} {p.es_activo && "(Activo)"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="font-bold uppercase text-xs tracking-widest">Sincronizando...</p>
        </div>
      ) : asignaciones.length > 0 ? (
        <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {asignaciones.map((asg) => (
            <Card key={asg.id} className="group border-none shadow-xl hover:shadow-2xl transition-all bg-white flex flex-col overflow-hidden rounded-[2rem]">
              <div className="h-2 bg-primary" />
              <CardHeader className="space-y-4 p-8">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 rounded-lg px-3 py-1">
                    UD: {asg.unidad_id.substring(0,8)}
                  </Badge>
                  <div className="p-3 bg-primary/5 rounded-2xl text-primary transition-all group-hover:bg-primary group-hover:text-white shadow-sm border border-primary/5">
                    <BookOpen className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl md:text-2xl font-headline font-black line-clamp-2 text-slate-800 leading-tight">
                    {asg.unidad_nombre}
                  </CardTitle>
                  <p className="text-[10px] font-black uppercase text-primary/60 mt-2 tracking-widest">
                    {asg.programa_nombre}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="px-8 py-0 space-y-4 flex-grow">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100/50 shadow-inner">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm border">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ciclo</span>
                      <span className="text-sm font-black text-slate-700">Sem {asg.semestre}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100/50 shadow-inner">
                    <div className="flex flex-col flex-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Estado Hoy</span>
                      {attendanceStatus[asg.unidad_id] ? (
                        <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1.5 mt-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> ASISTENCIA OK
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-amber-600 flex items-center gap-1.5 mt-1">
                          <CircleDashed className="h-3.5 w-3.5 animate-pulse" /> PENDIENTE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 p-8 flex flex-col gap-4 mt-8 border-t border-slate-100">
                <div className="flex gap-3 w-full">
                  {/* Botón de Asistencia con Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="flex-1 h-16 font-black shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white rounded-2xl uppercase text-[11px] tracking-widest gap-2 group/btn">
                        <Users className="h-5 w-5" /> ASISTENCIA <ChevronDown className="h-4 w-4 opacity-50 transition-transform group-hover/btn:translate-y-0.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64 rounded-[1.5rem] p-3 shadow-2xl border-slate-100">
                      <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest">Gestión Directa</DropdownMenuLabel>
                      <DropdownMenuItem asChild className="rounded-xl h-12 font-bold cursor-pointer hover:bg-primary/5 focus:bg-primary/5 text-primary">
                        <Link href={`/instructor/attendance/${asg.unidad_id}?periodo_id=${selectedPeriodId}`} className="flex items-center gap-3">
                          <ArrowRight className="h-4 w-4" /> Pasar Lista Hoy
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest">Reportes Académicos</DropdownMenuLabel>
                      <DropdownMenuItem 
                        className="rounded-xl h-12 font-bold cursor-pointer text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 focus:bg-emerald-50 flex items-center gap-3"
                        disabled={isExporting === asg.id}
                        onClick={() => handleExportExcel(asg)}
                      >
                        {isExporting === asg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                        Exportar Excel Matriz
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="rounded-xl h-12 font-bold cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 flex items-center gap-3"
                        disabled={isExportingPdf === asg.id}
                        onClick={() => handleExportPdf(asg)}
                      >
                        {isExportingPdf === asg.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                        Descargar PDF Oficial
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Botón de Evaluación / Registro Auxiliar */}
                  <Button asChild variant="outline" className="flex-1 h-16 font-black border-2 border-primary/20 text-primary hover:bg-primary/5 rounded-2xl uppercase text-[11px] tracking-widest shadow-sm">
                    <Link href={`/instructor/grades/${asg.unidad_id}?periodo_id=${selectedPeriodId}`} className="flex items-center justify-center gap-2">
                      <ClipboardCheck className="h-5 w-5" /> EVALUAR
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-24 text-center border-4 border-dashed border-slate-100 text-slate-400 bg-white rounded-[3rem]">
          <div className="p-8 bg-slate-50 rounded-full w-fit mx-auto mb-6">
            <LayoutDashboard className="h-16 w-16 opacity-10" />
          </div>
          <p className="font-black text-2xl text-slate-900 uppercase tracking-tighter">Sin carga académica registrada</p>
          <p className="text-sm font-medium italic mt-2">Contacta con administración para tu asignación oficial de cursos.</p>
        </Card>
      )}
    </div>
  )
}
