
"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Users, Clock, ArrowRight, FileSpreadsheet, FileText, Loader2, AlertCircle, Calendar, CheckCircle2, CircleDashed } from "lucide-react"
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

      const rows: any[] = []
      const periodName = periods.find(p => p.id === selectedPeriodId)?.nombre || "N/A"

      rows.push(["INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA"])
      rows.push(["REGISTRO OFICIAL DE ASISTENCIA ACADÉMICA"])
      rows.push([])
      rows.push(["DATOS DE LA UNIDAD DIDÁCTICA"])
      rows.push(["PROGRAMA PROFESIONAL:", asg.programa_nombre.toUpperCase(), "", "PERIODO:", periodName])
      rows.push(["UNIDAD DIDÁCTICA:", asg.unidad_nombre.toUpperCase(), "", "SEMESTRE:", asg.semestre])
      rows.push(["DOCENTE RESPONSABLE:", userName, "", "FECHA REPORTE:", new Date().toLocaleDateString()])
      rows.push([])

      const headerRow = ['N°', 'APELLIDOS Y NOMBRES']
      uniqueDates.forEach(d => {
        const [_, month, day] = d.split('-')
        headerRow.push(`${day}/${month}`)
      })
      headerRow.push('TOTAL FALTAS', '% INASISTENCIA')
      rows.push(headerRow)

      alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach((alumno, index) => {
        const studentRow: any[] = [(index + 1).toString().padStart(2, '0'), alumno.nombre.toUpperCase()]
        let absences = 0
        uniqueDates.forEach(date => {
          const status = matrix[alumno.id]?.[date] || "-"
          studentRow.push(status)
          if (status === 'F') absences++
        })
        const totalSessions = uniqueDates.length
        const pct = totalSessions > 0 ? ((absences / totalSessions) * 100).toFixed(1) : "0"
        studentRow.push(absences, `${pct}%`)
        rows.push(studentRow)
      })

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(rows)
      ws['!cols'] = [{ wch: 4 }, { wch: 45 }, ...uniqueDates.map(() => ({ wch: 6 })), { wch: 15 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(wb, ws, "Asistencia")
      XLSX.writeFile(wb, `MATRIZ_${asg.unidad_nombre.replace(/\s+/g, '_')}.xlsx`)
      toast({ title: "Excel Exportado" })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setIsExporting(null)
    }
  }

  const handleExportPdf = async (asg: any) => {
    setIsExportingPdf(asg.id)
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

      // Cabecera Institucional
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

      // Preparar Datos Tabla
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
        headStyles: { fillStyle: 'f', fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
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
            Mis Cursos
          </h2>
        </div>
        
        <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Periodo Activo</span>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="h-9 w-[220px] border-none bg-slate-50 font-bold text-slate-900">
                <Calendar className="h-4 w-4 mr-2 text-primary" />
                <SelectValue placeholder="Ciclo" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre} {p.es_activo && "(Actual)"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="font-bold">Cargando...</p>
        </div>
      ) : asignaciones.length > 0 ? (
        <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {asignaciones.map((asg) => (
            <Card key={asg.id} className="group border-none shadow-xl hover:shadow-2xl transition-all bg-white flex flex-col">
              <div className="h-2 bg-primary rounded-t-lg" />
              <CardHeader className="space-y-4 p-6">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-slate-50 border-slate-200">
                    ID: {asg.unidad_id.substring(0,8)}
                  </Badge>
                  <div className="p-2.5 bg-primary/5 rounded-xl text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <BookOpen className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl md:text-2xl font-headline font-extrabold line-clamp-2">
                    {asg.unidad_nombre}
                  </CardTitle>
                  <p className="text-[10px] font-black uppercase text-slate-400 mt-1">
                    {asg.programa_nombre}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="px-6 py-0 space-y-4 flex-grow">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <Users className="h-4 w-4 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Semestre</span>
                      <span className="text-xs font-bold text-slate-700">{asg.semestre}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Estado Hoy</span>
                      {attendanceStatus[asg.unidad_id] ? (
                        <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Tomada
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-600 flex items-center gap-1">
                          <CircleDashed className="h-3 w-3 animate-pulse" /> Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 p-6 gap-2 mt-4">
                <Button asChild className="flex-1 h-14 font-black shadow-lg shadow-primary/20">
                  <Link href={`/instructor/attendance/${asg.unidad_id}?periodo_id=${selectedPeriodId}`}>
                    Pasar Lista <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <div className="flex gap-1.5">
                  <Button 
                    variant="outline" 
                    className="h-14 w-11 p-0 border-slate-200 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    disabled={isExporting === asg.id}
                    onClick={() => handleExportExcel(asg)}
                    title="Exportar Excel"
                  >
                    {isExporting === asg.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-14 w-11 p-0 border-slate-200 text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={isExportingPdf === asg.id}
                    onClick={() => handleExportPdf(asg)}
                    title="Exportar PDF"
                  >
                    {isExportingPdf === asg.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-20 text-center border-dashed border-2 text-slate-400 bg-white rounded-3xl">
          <AlertCircle className="h-12 w-12 opacity-10 mx-auto mb-4" />
          <p className="font-bold text-lg text-slate-900">Sin carga académica registrada</p>
          <p className="text-sm">Contacta con administración para asignar unidades didácticas.</p>
        </Card>
      )}
    </div>
  )
}
