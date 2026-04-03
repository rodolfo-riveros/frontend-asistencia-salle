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
  RefreshCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { aiAttendanceInsights, type AttendanceInsightsOutput } from "@/ai/flows/ai-attendance-insights"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { api } from "@/lib/api"
import { getInitials } from "@/lib/utils"

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
  
  // Fecha sincronizada con Lima, Perú (America/Lima)
  const [date, setDate] = React.useState(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  })

  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<AttendanceInsightsOutput | null>(null)

  const fetchExistingAttendance = React.useCallback(async (studentList: any[]) => {
    if (!params.id || !date || studentList.length === 0) return
    setIsSyncing(true)
    try {
      // Consultamos el reporte de la unidad filtrado por la fecha actual
      const existing = await api.get<any[]>(`/asistencias/reporte/unidad/${params.id}?fecha_inicio=${date}&fecha_fin=${date}`)
      
      const mapped: Record<string, string | null> = {}
      studentList.forEach(s => mapped[s.id] = null)

      if (existing && existing.length > 0) {
        existing.forEach(reg => {
          // El backend puede devolver alumno_id, id_alumno o estar en una vista donde es 'alumno' (pero necesitamos el UUID)
          // Buscamos el ID del alumno comparando el DNI si el ID no viene directo
          const idAlumno = reg.alumno_id || reg.id_alumno;
          
          if (idAlumno) {
            mapped[idAlumno] = REVERSE_MAP[reg.estado] || reg.estado
          } else if (reg.dni) {
            // Fallback: buscar por DNI en la lista de alumnos cargada
            const student = studentList.find(s => s.dni === reg.dni);
            if (student) {
              mapped[student.id] = REVERSE_MAP[reg.estado] || reg.estado
            }
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

  // Recargar asistencia al cambiar la fecha
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
      return toast({ variant: "destructive", title: "Periodo no identificado", description: "Vuelve al panel principal y reintenta." })
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
      toast({ title: "¡Asistencia Guardada!", description: "Los registros se sincronizaron con éxito." })
      router.push('/instructor')
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: err.message })
    }
  }

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const history = await api.get<any[]>(`/asistencias/reporte/resumen/${params.id}`)
      const records = history.map(h => ({
        studentId: h.alumno_id,
        studentName: h.alumno,
        courseUnitId: params.id as string,
        courseUnitName: "UD",
        date: "Histórico",
        status: h.faltas > 2 ? "Falta" : "Presente"
      }))
      const result = await aiAttendanceInsights({ attendanceRecords: records as any })
      setAiResult(result)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de IA", description: "No hay datos históricos suficientes." })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const filteredStudents = students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

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
                <Label className="text-[9px] font-black uppercase text-slate-400">Día de Clase:</Label>
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
                  Sincronizando registros...
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Button variant="outline" className="flex-1 lg:flex-none h-12 px-6 gap-2 text-accent font-bold border-accent/20 hover:bg-accent/5" onClick={runAnalysis} disabled={isAnalyzing}>
              <Sparkles className={`h-5 w-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Análisis IA
            </Button>
            <Button className="flex-1 lg:flex-none h-12 px-8 gap-2 font-black shadow-lg shadow-primary/20" onClick={handleSave}>
              <Save className="h-5 w-5" /> Guardar Pase de Lista
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white overflow-hidden">
        {isLoading ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="font-bold text-lg">Cargando nómina de alumnos...</p>
          </div>
        ) : (
          <>
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
                  placeholder="Buscar alumno por nombre..." 
                  className="pl-10 h-11 bg-white border-none rounded-xl text-sm shadow-sm focus:ring-1 focus:ring-primary"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none">
                      <TableHead className="w-[80px] pl-8"></TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-4">Apellidos y Nombres</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-slate-400">Estado Actual</TableHead>
                      <TableHead className="text-right pr-8 font-black text-[10px] uppercase tracking-widest text-slate-400">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((s) => (
                        <TableRow key={s.id} className="hover:bg-slate-50/30 transition-colors border-slate-50 group">
                          <TableCell className="pl-8 py-4">
                            <Avatar className="h-11 w-11 border-2 border-white shadow-sm ring-2 ring-slate-100 group-hover:ring-primary/20 transition-all">
                              <AvatarFallback className="bg-primary/5 text-primary font-black text-xs">
                                {getInitials(s.nombre)}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell>
                            <div className="font-bold text-sm text-slate-900 uppercase tracking-tight">{s.nombre}</div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              DNI: <span className="font-bold">{s.dni}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {attendance[s.id] ? (
                              <Badge className={`uppercase text-[9px] font-black tracking-widest px-3 py-1 shadow-sm border-none ${
                                attendance[s.id] === 'Presente' ? 'bg-green-100 text-green-700' : 
                                attendance[s.id] === 'Falta' ? 'bg-red-100 text-red-700' : 
                                attendance[s.id] === 'Tarde' ? 'bg-amber-100 text-amber-700' : 
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {attendance[s.id]}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-dashed text-slate-300 text-[9px] uppercase font-bold bg-transparent">Sin Marcar</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex justify-end gap-2">
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
                          No se encontraron alumnos registrados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </>
        )}
      </Card>

      {aiResult && (
        <Card className="border-none shadow-2xl bg-slate-900 text-white p-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="h-6 w-6 text-yellow-400" />
            <h3 className="text-xl font-black uppercase tracking-tighter">Reporte de Inteligencia Académica</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <Label className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Resumen General</Label>
                <p className="mt-2 text-blue-50/80 leading-relaxed">{aiResult.summary}</p>
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-red-400 tracking-widest">Alumnos en Riesgo (30%+ Inasistencias)</Label>
                {aiResult.atRiskStudents.length > 0 ? aiResult.atRiskStudents.map((st, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{st.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{st.reason}</p>
                    </div>
                    <Badge variant="destructive" className="font-black">{st.absencePercentage}%</Badge>
                  </div>
                )) : <p className="text-xs text-emerald-400">No se detectaron alumnos en riesgo crítico.</p>}
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Tendencias Identificadas</Label>
                <div className="grid gap-2">
                  {aiResult.trends.map((t, i) => (
                    <div key={i} className="flex gap-3 text-sm text-blue-50/70 italic">
                      <span className="text-primary">•</span> {t}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5 bg-white/10 rounded-2xl border border-white/20">
                <Label className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Recomendaciones Pedagógicas</Label>
                <ul className="mt-4 space-y-3 text-sm">
                  {aiResult.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2">
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
    green: active ? "bg-green-600 text-white shadow-md scale-110 border-green-600" : "hover:bg-green-50 text-slate-400 hover:text-green-600",
    amber: active ? "bg-amber-500 text-white shadow-md scale-110 border-amber-500" : "hover:bg-amber-50 text-slate-400 hover:text-amber-600",
    red: active ? "bg-red-600 text-white shadow-md scale-110 border-red-600" : "hover:bg-red-50 text-slate-400 hover:text-red-600",
    blue: active ? "bg-blue-600 text-white shadow-md scale-110 border-blue-600" : "hover:bg-blue-50 text-slate-400 hover:text-blue-600",
  }
  return (
    <Button 
      size="icon" 
      variant="outline" 
      onClick={onClick} 
      className={`h-10 w-10 rounded-full transition-all border-slate-100 shrink-0 ${themes[color]}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
