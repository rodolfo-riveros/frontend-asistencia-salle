"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, Clock, ArrowRight, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

export default function InstructorDashboard() {
  const [asignaciones, setAsignaciones] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchAssignedCourses = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>('/me/asignaciones')
      setAsignaciones(data)
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "No se pudieron cargar tus unidades didácticas del servidor." 
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAssignedCourses()
  }, [fetchAssignedCourses])

  const handleExport = (name: string) => {
    toast({
      title: "Generando Reporte",
      description: `El archivo Excel para ${name} se está preparando en el servidor.`,
    })
  }

  return (
    <div className="space-y-8 md:space-y-12">
      <div className="space-y-4 border-b pb-6 md:pb-8">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-8 md:w-12 bg-primary rounded-full" />
          <span className="text-primary font-bold uppercase tracking-[0.3em] text-[8px] md:text-[10px]">Gestión Académica Real-Time</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-headline font-black tracking-tighter text-slate-900 leading-tight">
          Mis unidades didácticas son:
        </h2>
        <p className="text-slate-500 text-sm md:text-lg font-medium italic">
          Supervise el progreso institucional desde FastAPI
        </p>
      </div>

      {isLoading ? (
        <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="font-bold text-lg">Cargando unidades desde el backend...</p>
        </div>
      ) : asignaciones.length > 0 ? (
        <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {asignaciones.map((asg) => (
            <Card key={asg.id} className="group border-none shadow-xl hover:shadow-2xl transition-all bg-white overflow-hidden flex flex-col">
              <div className={`h-2 bg-gradient-to-r from-primary to-blue-400`} />
              <CardHeader className="space-y-4">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-slate-50 border-slate-200">
                    ID: {asg.unidad_id}
                  </Badge>
                  <div className="p-2.5 bg-primary/5 rounded-xl text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl md:text-2xl font-headline font-extrabold group-hover:text-primary transition-colors line-clamp-2">
                    {asg.unidad_nombre}
                  </CardTitle>
                  <p className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-tight">
                    {asg.programa_nombre}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Semestre</span>
                    <span className="text-sm font-bold text-slate-700 truncate">Ciclo {asg.semestre}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 p-4 md:p-6 gap-3">
                <Button asChild className="flex-1 h-12 md:h-14 font-black text-sm md:text-base shadow-lg shadow-primary/20">
                  <Link href={`/instructor/attendance/${asg.unidad_id}`}>
                    Asistencia <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-12 md:h-14 w-12 md:w-14 p-0 border-slate-200 hover:text-green-600 transition-all shrink-0"
                  onClick={() => handleExport(asg.unidad_nombre)}
                >
                  <FileSpreadsheet className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-20 text-center border-dashed border-2 flex flex-col items-center gap-4 text-slate-400">
          <AlertCircle className="h-12 w-12 opacity-20" />
          <p className="font-medium">No se encontraron unidades didácticas asignadas en el servidor.</p>
          <Button variant="link" onClick={fetchAssignedCourses}>Reintentar conexión</Button>
        </Card>
      )}
    </div>
  )
}
