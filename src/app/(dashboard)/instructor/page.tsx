
"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Users, Clock, ArrowRight, FileSpreadsheet, Loader2, AlertCircle, Calendar } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import * as XLSX from 'xlsx'

export default function InstructorDashboard() {
  const [asignaciones, setAsignaciones] = React.useState<any[]>([])
  const [periods, setPeriods] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<string>("")
  const [isExporting, setIsExporting] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
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
        description: "No se pudo conectar con el servidor para obtener tu carga académica." 
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
      title: "Generando Reporte",
      description: `Procesando matriz de asistencia para ${asg.unidad_nombre}...`,
    })

    try {
      // 1. Obtener datos: Reporte completo de asistencia y lista de alumnos matriculados
      const [reportData, alumnos] = await Promise.all([
        api.get<any[]>(`/asistencias/reporte/unidad/${asg.unidad_id}`),
        api.get<any[]>(`/me/unidades/${asg.unidad_id}/alumnos`)
      ])

      if (!alumnos || alumnos.length === 0) {
        throw new Error("No hay alumnos matriculados para generar el reporte.")
      }

      // 2. Procesar fechas únicas del periodo
      const uniqueDates = Array.from(new Set(reportData.map(r => r.fecha))).sort()
      
      // 3. Crear matriz de datos: Alumno -> { fecha: estado }
      const matrix: Record<string, Record<string, string>> = {}
      reportData.forEach(reg => {
        if (!matrix[reg.alumno_id]) matrix[reg.alumno_id] = {}
        matrix[reg.alumno_id][reg.fecha] = reg.estado
      })

      // 4. Construir filas del Excel
      const rows: any[] = []
      const periodName = periods.find(p => p.id === selectedPeriodId)?.nombre || "SIN PERIODO"

      // Cabecera institucional (Filas 1 y 2)
      rows.push([`CONTROL DE ASISTENCIA - ${asg.unidad_nombre.toUpperCase()} (${asg.semestre})`])
      rows.push([`PROGRAMA: ${asg.programa_nombre.toUpperCase()} | PERIODO: ${periodName}`])
      rows.push([]) // Fila vacía de separación

      // Encabezados de tabla
      const headerRow = ['N°', 'APELLIDOS Y NOMBRES']
      uniqueDates.forEach(d => {
        const dateObj = new Date(d)
        // Formato DD/MM
        headerRow.push(`${dateObj.getUTCDate()}/${dateObj.getUTCMonth() + 1}`)
      })
      headerRow.push('TOTAL FALTAS', '% INASISTENCIA')
      rows.push(headerRow)

      // Cuerpo de la tabla (Alumnos)
      alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach((alumno, index) => {
        const studentRow: any[] = [
          (index + 1).toString().padStart(2, '0'),
          alumno.nombre.toUpperCase()
        ]

        let faltasCount = 0
        uniqueDates.forEach(date => {
          const status = matrix[alumno.id]?.[date] || "-"
          studentRow.push(status)
          if (status === 'F') faltasCount++
        })

        const totalSesiones = uniqueDates.length
        const pctInasistencia = totalSesiones > 0 ? ((faltasCount / totalSesiones) * 100).toFixed(0) : "0"

        studentRow.push(faltasCount)
        studentRow.push(`${pctInasistencia}%`)
        rows.push(studentRow)
      })

      // 5. Crear el libro y aplicar estilos básicos (merge y anchos)
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(rows)

      // Configurar anchos de columna
      const wscols = [
        { wch: 5 },   // N°
        { wch: 45 },  // Nombres
        ...uniqueDates.map(() => ({ wch: 6 })), // Columnas de fechas
        { wch: 12 },  // Total Faltas
        { wch: 15 }   // % Inasistencia
      ]
      ws['!cols'] = wscols

      // Combinar celdas del título principal
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headerRow.length - 1 } }
      ]

      XLSX.utils.book_append_sheet(wb, ws, "Reporte Asistencia")

      // 6. Descargar archivo
      const fileName = `Reporte_${asg.unidad_nombre.replace(/\s+/g, '_')}_${periodName}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast({ title: "Exportación exitosa", description: "El archivo Excel ha sido generado." })
    } catch (err: any) {
      console.error(err)
      toast({ variant: "destructive", title: "Error al exportar", description: err.message || "No se pudo generar el Excel." })
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
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Periodo Lectivo Seleccionado</span>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="h-9 w-[220px] border-none bg-slate-50 font-bold text-slate-900 focus:ring-0">
                  <Calendar className="h-4 w-4 mr-2 text-primary" />
                  <SelectValue placeholder="Seleccione Ciclo" />
                </SelectTrigger>
                <SelectContent>
                  {periods.length > 0 ? (
                    periods.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre} {p.es_activo && "(Activo)"}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No hay periodos creados</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="font-bold text-lg">Sincronizando con FastAPI...</p>
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
                      <span className="text-[10px] font-bold text-slate-700">Vigente</span>
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
                  className="h-14 w-14 p-0 border-slate-200 hover:text-green-600 transition-all"
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
        <Card className="p-20 text-center border-dashed border-2 flex flex-col items-center gap-4 text-slate-400 bg-white">
          <AlertCircle className="h-12 w-12 opacity-10" />
          <div className="space-y-1">
            <p className="font-bold text-lg text-slate-900">Sin carga académica</p>
            <p className="text-sm">No se encontraron unidades asignadas para el periodo seleccionado.</p>
          </div>
          <Button variant="outline" className="mt-4 font-bold h-11 px-8" onClick={fetchData}>
            Actualizar Lista
          </Button>
        </Card>
      )}
    </div>
  )
}
