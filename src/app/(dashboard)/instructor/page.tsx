
"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  BookOpen, 
  Users, 
  Loader2, 
  Calendar, 
  CheckCircle2, 
  CircleDashed, 
  GraduationCap,
  ClipboardCheck,
  LayoutDashboard,
  Gamepad2
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { supabase } from "@/lib/supabase"

export default function InstructorDashboard() {
  const [asignaciones, setAsignaciones] = React.useState<any[]>([])
  const [periods, setPeriods] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<string>("")
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
                  <Button asChild variant="ghost" size="icon" className="h-12 w-12 rounded-2xl text-accent hover:bg-accent hover:text-white transition-all">
                    <Link href={`/instructor/quiz/${asg.unidad_id}`}>
                      <Gamepad2 className="h-6 w-6" />
                    </Link>
                  </Button>
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
              <CardFooter className="bg-slate-50/50 p-8 flex gap-3 mt-8 border-t border-slate-100">
                <Button asChild className="flex-1 h-16 font-black shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white rounded-2xl uppercase text-[11px] tracking-widest gap-2">
                  <Link href={`/instructor/attendance/${asg.unidad_id}?periodo_id=${selectedPeriodId}`}>
                    <Users className="h-5 w-5" /> ASISTENCIA
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 h-16 font-black border-2 border-primary/20 text-primary hover:bg-primary/5 rounded-2xl uppercase text-[11px] tracking-widest shadow-sm">
                  <Link href={`/instructor/grades/${asg.unidad_id}?periodo_id=${selectedPeriodId}`}>
                    <ClipboardCheck className="h-5 w-5" /> EVALUACIÓN
                  </Link>
                </Button>
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
