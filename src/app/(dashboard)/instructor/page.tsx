
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

export default function InstructorDashboard() {
  const [asignaciones, setAsignaciones] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activePeriod, setActivePeriod] = React.useState("2024-I")

  const fetchAssignedCourses = React.useCallback(async () => {
    setIsLoading(true)
    try {
      // Sincronizado: Solo carga las unidades del periodo seleccionado
      const data = await api.get<any[]>(`/me/asignaciones?periodo=${activePeriod}`)
      setAsignaciones(data)
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error de Conexión", 
        description: "No se pudo sincronizar con el servidor de FastAPI." 
      })
    } finally {
      setIsLoading(false)
    }
  }, [activePeriod])

  React.useEffect(() => {
    fetchAssignedCourses()
  }, [fetchAssignedCourses])

  const handleExport = (name: string) => {
    toast({
      title: "Exportando Reporte",
      description: `Generando Excel de asistencia para ${name}.`,
    })
  }

  return (
    <div className="space-y-8 md:space-y-12">
      <div className="space-y-4 border-b pb-6 md:pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-12 bg-primary rounded-full" />
              <span className="text-primary font-bold uppercase tracking-[0.3em] text-[10px]">Portal del Docente</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-headline font-black tracking-tighter text-slate-900 leading-tight">
              Mis unidades didácticas
            </h2>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Periodo Académico</span>
              <Select value={activePeriod} onValueChange={setActivePeriod}>
                <SelectTrigger className="h-9 w-[160px] border-none bg-slate-50 font-bold text-slate-900">
                  <Calendar className="h-4 w-4 mr-2 text-primary" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023-II">Ciclo 2023-II</SelectItem>
                  <SelectItem value="2024-I">Ciclo 2024-I</SelectItem>
                  <SelectItem value="2024-II">Ciclo 2024-II</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="font-bold text-lg">Cargando carga académica del periodo...</p>
        </div>
      ) : asignaciones.length > 0 ? (
        <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {asignaciones.map((asg) => (
            <Card key={asg.id} className="group border-none shadow-xl hover:shadow-2xl transition-all bg-white overflow-hidden flex flex-col">
              <div className={`h-2 bg-gradient-to-r from-primary to-blue-400`} />
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
                      <span className="text-xs font-bold text-slate-700">Ciclo {asg.semestre}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Horario</span>
                      <span className="text-[10px] font-bold text-slate-700">Ver Detalles</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 p-6 gap-3">
                <Button asChild className="flex-1 h-14 font-black text-sm shadow-lg shadow-primary/20">
                  <Link href={`/instructor/attendance/${asg.unidad_id}`}>
                    Pasar Lista <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-14 w-14 p-0 border-slate-200 hover:text-green-600 transition-all"
                  onClick={() => handleExport(asg.unidad_nombre)}
                >
                  <FileSpreadsheet className="h-6 w-6" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-20 text-center border-dashed border-2 flex flex-col items-center gap-4 text-slate-400">
          <AlertCircle className="h-12 w-12 opacity-10" />
          <div className="space-y-1">
            <p className="font-bold text-lg text-slate-900">Sin carga académica</p>
            <p className="text-sm">No tienes unidades asignadas para el periodo {activePeriod}.</p>
          </div>
          <Button variant="outline" className="mt-4 font-bold h-11 px-8" onClick={fetchAssignedCourses}>
            Sincronizar de nuevo
          </Button>
        </Card>
      )}
    </div>
  )
}
