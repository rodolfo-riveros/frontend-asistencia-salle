
"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  FileText,
  BookMarked,
  FolderOpen,
  FileWarning
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { MaterialesTab } from "@/components/instructor/materiales-tab"
import { SeccionesTab } from "@/components/instructor/secciones-tab"

function CourseCard({ asg, attendanceStatus, selectedPeriodId }: {
  asg: any
  attendanceStatus: Record<string, boolean>
  selectedPeriodId: string
}) {
  const isRec = asg.seccion === 'REC'
  const accent = isRec ? 'amber' : 'primary'
  const accentBg = isRec ? 'bg-amber-500/10' : 'bg-primary/5'
  const accentBorder = isRec ? 'border-amber-500/20' : 'border-primary/10'
  const statusOk = attendanceStatus[asg.unidad_id]

  return (
    <Card className="group border-0 bg-card rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 shadow-lg relative">
      {/* Accent top bar */}
      <div className={`h-1.5 w-full ${isRec ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-primary/80 to-primary'}`} />

      {/* Header */}
      <CardHeader className="px-6 pt-6 pb-0 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border ${isRec ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-primary/5 text-primary border-primary/10'}`}>
              <BookOpen className="h-3 w-3 mr-1" />
              {asg.unidad_id.substring(0, 8)}
            </Badge>
            <Badge className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border ${
              isRec
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
            }`}>
              {isRec ? 'Recuperación' : 'Regular'}
            </Badge>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentBg} border ${accentBorder}`}>
            <GraduationCap className={`h-5 w-5 ${isRec ? 'text-amber-500' : 'text-primary'}`} />
          </div>
        </div>

        <div>
          <CardTitle className="text-lg font-bold text-foreground leading-snug line-clamp-2">
            {asg.unidad_nombre}
          </CardTitle>
          <p className="text-xs font-semibold text-muted-foreground mt-1.5 tracking-wide">
            {asg.programa_nombre}
          </p>
        </div>
      </CardHeader>

      {/* Stats */}
      <CardContent className="px-6 pt-5 pb-0">
        <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-muted/50 border border-border">
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentBg} border ${accentBorder}`}>
              <Calendar className={`h-4 w-4 ${isRec ? 'text-amber-500' : 'text-primary'}`} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Ciclo</p>
              <p className="text-sm font-bold text-foreground/90">Sem {asg.semestre}</p>
            </div>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="flex items-center gap-3 flex-1">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${statusOk ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'} border`}>
              {statusOk
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                : <CircleDashed className="h-4 w-4 text-amber-400" />
              }
            </div>
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Estado Hoy</p>
              <p className={`text-sm font-bold ${statusOk ? 'text-emerald-400' : 'text-amber-500'}`}>
                {statusOk ? 'Completado' : 'Pendiente'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Actions */}
      <CardFooter className="px-6 pt-5 pb-6 mt-5 flex gap-3">
        <Button asChild className={`flex-1 h-12 font-bold text-xs rounded-2xl shadow-lg ${isRec ? 'shadow-amber-500/20 bg-amber-500 hover:bg-amber-600' : 'shadow-primary/20 bg-primary hover:bg-primary/90'} text-white`}>
          <Link href={`/instructor/attendance/${asg.unidad_id}?periodo_id=${selectedPeriodId}`}>
            <Users className="h-4 w-4 mr-1.5" /> ASISTENCIA
          </Link>
        </Button>
        <Button asChild variant="outline" className={`flex-1 h-12 font-bold text-xs rounded-2xl border-2 ${isRec ? 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10' : 'border-primary/20 text-primary hover:bg-primary/5'}`}>
          <Link href={`/instructor/grades/${asg.unidad_id}?periodo_id=${selectedPeriodId}`}>
            <ClipboardCheck className="h-4 w-4 mr-1.5" /> NOTAS
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function InstructorDashboard() {
  const [asignaciones, setAsignaciones] = React.useState<any[]>([])
  const [periods, setPeriods] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<string>("")
  const [attendanceStatus, setAttendanceStatus] = React.useState<Record<string, boolean>>({})

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

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
          <h2 className="text-3xl md:text-5xl font-headline font-black tracking-tighter text-foreground leading-tight">
            Gestión de Cursos
          </h2>
        </div>
        
        <div className="bg-card p-4 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Periodo Actual</span>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="h-9 w-[220px] border-none bg-muted font-bold text-foreground">
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

      <Tabs defaultValue="cursos">
        <TabsList className="bg-muted p-1 rounded-2xl gap-1">
          <TabsTrigger value="cursos" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md px-6 py-2.5 font-bold text-xs">
            <GraduationCap className="h-4 w-4 mr-2" />Cursos
          </TabsTrigger>
          <TabsTrigger value="silabos" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md px-6 py-2.5 font-bold text-xs">
            <FileText className="h-4 w-4 mr-2" />Silabos
            <Badge variant="outline" className="ml-2 text-[8px] px-1.5 py-0.5 border-amber-400 text-amber-500 font-bold">BETA</Badge>
          </TabsTrigger>
          <TabsTrigger value="secciones" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md px-6 py-2.5 font-bold text-xs">
            <BookMarked className="h-4 w-4 mr-2" />Secciones
            <Badge variant="outline" className="ml-2 text-[8px] px-1.5 py-0.5 border-amber-400 text-amber-500 font-bold">BETA</Badge>
          </TabsTrigger>
          <TabsTrigger value="materiales" className="rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md px-6 py-2.5 font-bold text-xs">
            <FolderOpen className="h-4 w-4 mr-2" />Materiales
            <Badge variant="outline" className="ml-2 text-[8px] px-1.5 py-0.5 border-amber-400 text-amber-500 font-bold">BETA</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cursos" className="mt-8 space-y-8">
          {isLoading ? (
            <div className="h-96 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="font-bold uppercase text-xs tracking-widest">Sincronizando...</p>
            </div>
          ) : asignaciones.length > 0 ? (
            <>
              {asignaciones.filter(a => a.seccion !== 'REC').length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Cursos Regulares</h3>
                  </div>
                  <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {asignaciones.filter(a => a.seccion !== 'REC').map((asg) => (
                      <CourseCard asg={asg} attendanceStatus={attendanceStatus} selectedPeriodId={selectedPeriodId} key={asg.id} />
                    ))}
                  </div>
                </div>
              )}
              {asignaciones.filter(a => a.seccion === 'REC').length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Cursos de Recuperación</h3>
                  </div>
                  <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {asignaciones.filter(a => a.seccion === 'REC').map((asg) => (
                      <CourseCard asg={asg} attendanceStatus={attendanceStatus} selectedPeriodId={selectedPeriodId} key={asg.id} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card className="p-24 text-center border-4 border-dashed border-border text-muted-foreground bg-card rounded-[3rem]">
              <div className="p-8 bg-muted rounded-full w-fit mx-auto mb-6">
                <LayoutDashboard className="h-16 w-16 opacity-10" />
              </div>
              <p className="font-black text-2xl text-foreground uppercase tracking-tighter">Sin carga académica registrada</p>
              <p className="text-sm font-medium italic mt-2">Contacta con administración para tu asignación oficial de cursos.</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="silabos" className="mt-8">
          <Card className="p-20 text-center border-2 border-dashed border-border text-muted-foreground bg-card rounded-[3rem]">
            <div className="p-8 bg-muted rounded-full w-fit mx-auto mb-6">
              <FileWarning className="h-20 w-20 text-amber-400" />
            </div>
            <div className="flex items-center justify-center gap-3 mb-4">
              <h3 className="font-black text-3xl text-foreground uppercase tracking-tighter">Elaboración de Silabos</h3>
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs px-3 py-1 font-bold">En Desarrollo</Badge>
            </div>
            <p className="text-base font-medium italic max-w-md mx-auto text-muted-foreground">
              Próximamente podrás crear y gestionar los silabos de tus cursos asignados.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="secciones" className="mt-8">
          <SeccionesTab />
        </TabsContent>

        <TabsContent value="materiales" className="mt-8">
          <MaterialesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
