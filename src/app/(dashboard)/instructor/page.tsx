
"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Users, Clock, ArrowRight, FileSpreadsheet, Loader2, AlertCircle, Calendar, GraduationCap } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import * as XLSX from 'xlsx'

export default function InstructorDashboard() {
  const [asignaciones, setAsignaciones] = React.useState<any[]>([])
  const [periods, setPeriods] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<string>("")
  const [isExporting, setIsExporting] = React.useState<string | null>(null)
  const [userName, setUserName] = React.useState("USUARIO DOCENTE")

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

  const handleExport = async (asg: any) => {
    setIsExporting(asg.id)
    toast({
      title: "Generando Matriz Académica",
      description: `Procesando matriz de asistencia profesional para ${asg.unidad_nombre}...`,
    })

    try {
      // 1. Obtener datos (Usamos 'unidad' como exige la vista del backend según el log)
      const [reportData, alumnos] = await Promise.all([
        api.get<any[]>(`/asistencias/reporte/unidad/${asg.unidad_id}`).catch(() => []),
        api.get<any[]>(`/me/unidades/${asg.unidad_id}/alumnos`).catch(() => [])
      ])

      if (!alumnos || alumnos.length === 0) {
        throw new Error("No hay alumnos matriculados para generar el reporte.")
      }

      // 2. Procesar fechas únicas y pivotar datos
      const uniqueDates = Array.from(new Set(reportData.map(r => r.fecha))).sort()
      const matrix: Record<string, Record<string, string>> = {}
      reportData.forEach(reg => {
        const idAlumno = reg.alumno_id || reg.id_alumno;
        if (!matrix[idAlumno]) matrix[idAlumno] = {}
        matrix[idAlumno][reg.fecha] = reg.estado
      })

      // 3. Construir Matriz de Alto Impacto (AOA)
      const rows: any[] = []
      const periodName = periods.find(p => p.id === selectedPeriodId)?.nombre || "N/A"

      // CABECERA INSTITUCIONAL ELABORADA
      rows.push(["INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA"])
      rows.push(["REGISTRO OFICIAL DE ASISTENCIA ACADÉMICA"])
      rows.push([])
      rows.push(["DATOS DE LA UNIDAD DIDÁCTICA"])
      rows.push(["PROGRAMA PROFESIONAL:", asg.programa_nombre.toUpperCase(), "", "PERIODO:", periodName])
      rows.push(["UNIDAD DIDÁCTICA:", asg.unidad_nombre.toUpperCase(), "", "SEMESTRE:", asg.semestre])
      rows.push(["DOCENTE RESPONSABLE:", userName, "", "FECHA REPORTE:", new Date().toLocaleDateString()])
      rows.push([])

      // ENCABEZADOS DE TABLA MATRICIAL
      const headerRow = ['N°', 'APELLIDOS Y NOMBRES']
      uniqueDates.forEach(d => {
        const [year, month, day] = d.split('-')
        headerRow.push(`${day}/${month}`)
      })
      headerRow.push('TOTAL FALTAS', '% INASISTENCIA')
      rows.push(headerRow)

      // CUERPO DE DATOS
      alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach((alumno, index) => {
        const studentRow: any[] = [
          (index + 1).toString().padStart(2, '0'),
          alumno.nombre.toUpperCase()
        ]

        let absences = 0
        uniqueDates.forEach(date => {
          const status = matrix[alumno.id]?.[date] || "-"
          studentRow.push(status)
          if (status === 'F') absences++
        })

        const totalSessions = uniqueDates.length
        const pct = totalSessions > 0 ? ((absences / totalSessions) * 100).toFixed(1) : "0"

        studentRow.push(absences)
        studentRow.push(`${pct}%`)
        rows.push(studentRow)
      })

      // 4. Crear Workbook y Aplicar Estilos
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(rows)

      // Configuración de anchos de columna para profesionalismo
      const wscols = [
        { wch: 5 },   // N°
        { wch: 50 },  // Nombres (ancho para apellidos)
        ...uniqueDates.map(() => ({ wch: 7 })), // Fechas (estrecho)
        { wch: 15 },  // Total Faltas
        { wch: 18 }   // % Inasistencia
      ]
      ws['!cols'] = wscols

      // Combinación de celdas para títulos (Merges)
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } }, // Título Central
        { s: { r: 1, c: 0 }, e: { r: 1, c: headerRow.length - 1 } }, // Subtítulo
        { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, // Subsección Datos
        { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } }, // Programa
        { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } }, // Unidad
        { s: { r: 6, c: 1 }, e: { r: 6, c: 2 } }, // Docente
      ]

      XLSX.utils.book_append_sheet(wb, ws, "Matriz_Asistencia")

      // 5. Descargar archivo
      const fileName = `MATRIZ_${asg.unidad_nombre.replace(/\s+/g, '_')}_${periodName}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast({ title: "Reporte Profesional Exportado", description: `Se ha descargado la matriz para ${asg.unidad_nombre}.` })
    } catch (err: any) {
      console.error(err)
      toast({ variant: "destructive", title: "Error en reporte", description: err.message })
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <div className="space-y-8 md:space-y-12">
      <div className="space-y-4 border-b pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-12 bg-primary rounded-full" />
              <span className="text-primary font-bold uppercase tracking-[0.3em] text-[10px]">Portal del Docente</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-headline font-black tracking-tighter text-slate-900 leading-tight">
              Carga Académica
            </h2>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Periodo Lectivo Activo</span>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="h-9 w-[220px] border-none bg-slate-50 font-bold text-slate-900 focus:ring-0">
                  <Calendar className="h-4 w-4 mr-2 text-primary" />
                  <SelectValue placeholder="Seleccione Ciclo" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} {p.es_activo && "(Actual)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="font-bold text-lg">Sincronizando carga académica...</p>
        </div>
      ) : asignaciones.length > 0 ? (
        <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {asignaciones.map((asg) => (
            <Card key={asg.id} className="group border-none shadow-xl hover:shadow-2xl transition-all bg-white overflow-hidden flex flex-col">
              <div className={`h-2 bg-gradient-to-r from-primary to-blue-400`} />
              <CardHeader className="space-y-4 p-6">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-slate-50 border-slate-200">
                    UD: {asg.unidad_id.substring(0,8)}
                  </Badge>
                  <div className="p-2.5 bg-primary/5 rounded-xl text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <BookOpen className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl md:text-2xl font-headline font-extrabold line-clamp-2">
                    {asg.unidad_nombre}
                  </CardTitle>
                  <p className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-tight">
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
                      <span className="text-[8px] font-black text-slate-400 uppercase">Estado</span>
                      <span className="text-[10px] font-bold text-slate-700">Dictando</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 p-6 gap-3">
                <Button asChild className="flex-1 h-14 font-black text-sm shadow-lg shadow-primary/20">
                  <Link href={`/instructor/attendance/${asg.unidad_id}?periodo_id=${selectedPeriodId}`}>
                    Pasar Lista <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-14 w-14 p-0 border-slate-200 hover:text-green-600 hover:bg-green-50/50 transition-all"
                  disabled={isExporting === asg.id}
                  onClick={() => handleExport(asg)}
                >
                  {isExporting === asg.id ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileSpreadsheet className="h-6 w-6" />}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-20 text-center border-dashed border-2 flex flex-col items-center gap-4 text-slate-400 bg-white rounded-3xl">
          <AlertCircle className="h-12 w-12 opacity-10" />
          <div className="space-y-1">
            <p className="font-bold text-lg text-slate-900">Sin carga académica registrada</p>
            <p className="text-sm">Contacta con administración para que se te asigne unidades en el periodo actual.</p>
          </div>
          <Button variant="outline" className="mt-4 font-bold rounded-xl" onClick={fetchData}>
            Actualizar Sincronización
          </Button>
        </Card>
      )}
    </div>
  )
}
