
"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, 
  Search, 
  Save, 
  Sparkles,
  UserCheck,
  UserX,
  Clock,
  MessageSquareQuote,
  Loader2,
  RefreshCcw,
  PieChart as PieIcon,
  BarChart3,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { aiAttendanceInsights, type AttendanceInsightsOutput } from "@/ai/flows/ai-attendance-insights"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { api } from "@/lib/api"
import { getInitials } from "@/lib/utils"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

const STATUS_MAP: Record<string, string> = {
  'Presente': 'P',
  'Falta': 'F',
  'Tarde': 'T',
  'Justificado': 'J'
}

const REVERSE_MAP: Record<string, string> = {
  'P': 'Presente',
  'F': 'Falta',
  'T': 'Tarde',
  'J': 'Justificado'
}

const COLORS = {
  Presente: '#10b981', 
  Falta: '#ef4444',    
  Tarde: '#f59e0b',    
  Justificado: '#3b82f6' 
}

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
    // Sincronización con fecha Perú
    const now = new Date();
    return new Date(now.getTime() - (5 * 60 * 60 * 1000)).toISOString().split('T')[0];
  })

  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<AttendanceInsightsOutput | null>(null)

  const fetchExistingAttendance = React.useCallback(async (studentList: any[]) => {
    if (!params.id || !date || studentList.length === 0) return
    setIsSyncing(true)
    try {
      // Cargamos registros previos para la fecha seleccionada
      const existing = await api.get<any[]>(`/asistencias/reporte/unidad/${params.id}?fecha_inicio=${date}&fecha_fin=${date}`)
      
      const mapped: Record<string, string | null> = {}
      studentList.forEach(s => mapped[s.id] = null)

      if (existing && Array.isArray(existing)) {
        existing.forEach(reg => {
          // Mapeo flexible para evitar errores de nombres de campos
          const idAlumno = reg.alumno_id || reg.id_alumno || reg.id;
          if (idAlumno && mapped[idAlumno] !== undefined) {
            mapped[idAlumno] = REVERSE_MAP[reg.estado] || reg.estado
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
      const data = await api.get<any[]>(`/me/unidades/${params.id}/alumnos`)
      setStudents(data)
      await fetchExistingAttendance(data)
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "No se pudo cargar la lista de alumnos." 
      })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, fetchExistingAttendance])

  React.useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  React.useEffect(() => {
    if (students.length > 0) {
      fetchExistingAttendance(students)
    }
  }, [date, students, fetchExistingAttendance])

  const handleStatus = (id: string, status: string) => setAttendance(p => ({ ...p, [id]: status }))
  
  const handleMassive = (status: string) => {
    const newAttendance = { ...attendance }
    students.forEach(s => {
      newAttendance[s.id] = status
    })
    setAttendance(newAttendance)
    toast({ title: "Marcado Masivo", description: `Todos marcados como ${status}.` })
  }

  const handleSave = async () => {
    const records = Object.entries(attendance).filter(([_, estado]) => estado !== null);
    
    if (records.length === 0) {
      return toast({ variant: "destructive", title: "Sin cambios", description: "Selecciona al menos un estado de asistencia." })
    }
    
    if (!periodoId) {
      return toast({ variant: "destructive", title: "Periodo no identificado", description: "Vuelve al panel principal e intenta de nuevo." })
    }

    const payload = {
      unidad_id: params.id as string,
      periodo_id: periodoId,
      fecha: date,
      registros: records.map(([studentId, estado]) => ({
        alumno_id: studentId,
        estado: STATUS_MAP[estado as string] || estado
      }))
    }

    try {
      await api.post('/asistencias/pase-lista', payload)
      toast({ title: "¡Asistencia Guardada!", description: "Sincronización exitosa con la base de datos." })
      router.push('/instructor')
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: err.message })
    }
  }

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const history = await api.get<any[]>(`/asistencias/reporte/unidad/${params.id}`)
      
      const records = history.map(h => ({
        studentId: h.alumno_id || h.id_alumno || "id",
        studentName: h.alumno,
        courseUnitId: params.id as string,
        courseUnitName: "Unidad Didáctica",
        date: h.fecha,
        status: REVERSE_MAP[h.estado] || h.estado
      }))

      const result = await aiAttendanceInsights({ 
        attendanceRecords: records as any,
        analysisContext: "Analizar específicamente tardanzas frecuentes como alerta pedagógica temprana."
      })
      setAiResult(result)
      toast({ title: "Análisis IA Completado" })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de IA", description: "No hay registros históricos suficientes." })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const filteredStudents = students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  const statsData = React.useMemo(() => {
    const counts = { Presente: 0, Falta: 0, Tarde: 0, Justificado: 0 }
    Object.values(attendance).forEach(val => {
      if (val && counts.hasOwnProperty(val)) {
        counts[val as keyof typeof counts]++
      }
    })
    return [
      { name: 'Presente', value: counts.Presente, fill: COLORS.Presente },
      { name: 'Falta', value: counts.Falta, fill: COLORS.Falta },
      { name: 'Tarde', value: counts.Tarde, fill: COLORS.Tarde },
      { name: 'Justificado', value: counts.Justificado, fill: COLORS.Justificado }
    ].filter(d => d.value > 0)
  }, [attendance])

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="h-10 text-primary font-bold hover:bg-primary/5">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel
        </Button>
        
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          <div className="space-y-3 w-full lg:w-auto">
            <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tighter text-slate-900 leading-tight">Control de Asistencia</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border shadow-sm">
                <Label className="text-[9px] font-black uppercase text-slate-400">Fecha de Sesión:</Label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="bg-transparent border-none font-bold text-sm text-slate-700 outline-none w-36" 
                />
              </div>
              {isSyncing && (
                <div className="flex items-center gap-2 text-primary/60 text-xs font-bold animate-pulse">
                  <RefreshCcw className="h-3 w-3 animate-spin" />
                  Sincronizando...
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Button variant="outline" className="flex-1 lg:flex-none h-12 px-6 gap-2 text-accent font-bold border-accent/20 hover:bg-accent/5" onClick={runAnalysis} disabled={isAnalyzing}>
              <Sparkles className={`h-5 w-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Diagnóstico IA
            </Button>
            <Button className="flex-1 lg:flex-none h-12 px-8 gap-2 font-black shadow-lg shadow-primary/20" onClick={handleSave}>
              <Save className="h-5 w-5" /> Guardar Pase de Lista
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-xl bg-white overflow-hidden">
          <div className="p-4 md:p-6 bg-slate-50/80 border-b flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Button variant="outline" size="sm" className="h-10 px-4 border-green-200 bg-white text-green-700 font-black text-[10px] hover:bg-green-50" onClick={() => handleMassive('Presente')}>P a Todos</Button>
              <Button variant="outline" size="sm" className="h-10 px-4 border-amber-200 bg-white text-amber-700 font-black text-[10px] hover:bg-amber-50" onClick={() => handleMassive('Tarde')}>T a Todos</Button>
              <Button variant="outline" size="sm" className="h-10 px-4 border-red-200 bg-white text-red-700 font-black text-[10px] hover:bg-red-50" onClick={() => handleMassive('Falta')}>F a Todos</Button>
              <Button variant="outline" size="sm" className="h-10 px-4 border-blue-200 bg-white text-blue-700 font-black text-[10px] hover:bg-blue-50" onClick={() => handleMassive('Justificado')}>J a Todos</Button>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por nombre..." 
                className="pl-10 h-11 bg-white border-none rounded-xl text-sm shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-bold">Cargando alumnos...</p>
              </div>
            ) : (
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none">
                      <TableHead className="w-[80px] pl-8 py-4">Estudiante</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Apellidos y Nombres</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-slate-400">Estado</TableHead>
                      <TableHead className="text-right pr-8 font-black text-[10px] uppercase tracking-widest text-slate-400">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((s) => (
                        <TableRow key={s.id} className="hover:bg-slate-50/30 transition-colors border-slate-50 group">
                          <TableCell className="pl-8 py-4">
                            <Avatar className="h-11 w-11 border-2 border-white shadow-sm ring-2 ring-slate-100 group-hover:ring-primary/20 transition-all">
                              <AvatarFallback className="bg-primary/5 text-primary font-black text-xs uppercase">
                                {getInitials(s.nombre)}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-sm text-slate-900 uppercase tracking-tight">{s.nombre}</div>
                            <div className="text-[10px] text-slate-400 font-mono">DNI: {s.dni}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            {attendance[s.id] ? (
                              <Badge className={`uppercase text-[9px] font-black tracking-widest px-3 py-1 border-none ${
                                attendance[s.id] === 'Presente' ? 'bg-green-100 text-green-700' : 
                                attendance[s.id] === 'Falta' ? 'bg-red-100 text-red-700' : 
                                attendance[s.id] === 'Tarde' ? 'bg-amber-100 text-amber-700' : 
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {attendance[s.id]}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-dashed text-slate-300 text-[9px] uppercase font-bold">Pendiente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex justify-end gap-1.5">
                              <ActionBtn icon={UserCheck} label="P" active={attendance[s.id] === 'Presente'} color="green" onClick={() => handleStatus(s.id, 'Presente')} />
                              <ActionBtn icon={Clock} label="T" active={attendance[s.id] === 'Tarde'} color="amber" onClick={() => handleStatus(s.id, 'Tarde')} />
                              <ActionBtn icon={UserX} label="F" active={attendance[s.id] === 'Falta'} color="red" onClick={() => handleStatus(s.id, 'Falta')} />
                              <ActionBtn icon={MessageSquareQuote} label="J" active={attendance[s.id] === 'Justificado'} color="blue" onClick={() => handleStatus(s.id, 'Justificado')} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-48 text-center text-slate-300">
                          Sin alumnos registrados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <PieIcon className="h-5 w-5 text-primary" /> Distribución Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {statsData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-bold">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-slate-500 uppercase">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" /> Comparativa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData}>
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {statsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {aiResult && (
        <Card className="border-none shadow-2xl bg-slate-900 text-white p-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-yellow-400/10 rounded-lg">
              <Sparkles className="h-6 w-6 text-yellow-400" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Diagnóstico Académico de IA</h3>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Resumen de Situación</Label>
                <p className="text-blue-50/90 leading-relaxed font-medium">{aiResult.summary}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-red-500" />
                  <Label className="text-[10px] font-black uppercase text-red-400 tracking-widest">
                    Riesgo de Deserción ({'≥'} 30% Faltas)
                  </Label>
                </div>
                {aiResult.atRiskStudents.length > 0 ? aiResult.atRiskStudents.map((st, i) => (
                  <div key={i} className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-red-50">{st.name}</p>
                      <p className="text-xs text-red-200/60 mt-1">{st.reason}</p>
                    </div>
                    <Badge className="bg-red-500 text-white font-black">{st.absencePercentage}%</Badge>
                  </div>
                )) : <p className="text-xs text-emerald-400">No se detectó riesgo crítico de deserción.</p>}
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <Label className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Alerta Temprana: Tardanzas Frecuentes</Label>
                </div>
                {aiResult.warningStudents && aiResult.warningStudents.length > 0 ? aiResult.warningStudents.map((st, i) => (
                  <div key={i} className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-amber-50">{st.name}</p>
                      <Badge variant="outline" className="text-amber-500 border-amber-500/40 text-[10px]">{st.tardyCount} Tardanzas</Badge>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-[10px] font-black uppercase text-amber-400 mb-1">Sugerencia:</p>
                      <p className="text-[11px] text-white/80">{st.suggestion}</p>
                    </div>
                  </div>
                )) : <p className="text-xs text-emerald-400">Sin patrones de tardanza preocupantes.</p>}
              </div>

              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <Label className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Recomendaciones Estratégicas</Label>
                <ul className="space-y-3">
                  {aiResult.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-3 text-sm text-blue-50/80">
                      <span className="font-black text-emerald-500">✓</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function ActionBtn({ icon: Icon, active, color, onClick }: any) {
  const themes: any = {
    green: active ? "bg-green-600 text-white scale-110" : "text-slate-400 hover:text-green-600",
    amber: active ? "bg-amber-500 text-white scale-110" : "text-slate-400 hover:text-amber-600",
    red: active ? "bg-red-600 text-white scale-110" : "text-slate-400 hover:text-red-600",
    blue: active ? "bg-blue-600 text-white scale-110" : "text-slate-400 hover:text-blue-600",
  }
  return (
    <Button 
      size="icon" 
      variant="outline" 
      onClick={onClick} 
      className={`h-9 w-9 rounded-full transition-all border-slate-100 ${themes[color]}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
