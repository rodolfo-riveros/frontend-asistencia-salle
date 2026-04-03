
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
  
  const [date, setDate] = React.useState(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  })

  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<AttendanceInsightsOutput | null>(null)

  const fetchExistingAttendance = React.useCallback(async () => {
    if (!params.id || !date) return
    setIsSyncing(true)
    try {
      // Nota: El backend usa "unidad" segun el error reportado
      const existing = await api.get<any[]>(`/asistencias/reporte/unidad/${params.id}?fecha_inicio=${date}&fecha_fin=${date}`)
      
      if (existing && existing.length > 0) {
        const mapped: Record<string, string> = {}
        existing.forEach(reg => {
          if (reg.alumno_id) {
            mapped[reg.alumno_id] = REVERSE_MAP[reg.estado] || reg.estado
          }
        })
        
        setAttendance(prev => {
          const newState = { ...prev }
          Object.keys(mapped).forEach(key => {
            newState[key] = mapped[key]
          })
          return newState
        })
      }
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
      const initialMap = Object.fromEntries(data.map(s => [s.id, null]))
      setAttendance(initialMap)
      
      await fetchExistingAttendance()
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "No se pudo cargar la lista." 
      })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, fetchExistingAttendance])

  React.useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Recargar si cambia la fecha
  React.useEffect(() => {
    if (!isLoading && students.length > 0) {
      fetchExistingAttendance()
    }
  }, [date, fetchExistingAttendance, isLoading, students.length])

  const handleStatus = (id: string, status: string) => setAttendance(p => ({ ...p, [id]: status }))
  
  const handleMassive = (status: string) => {
    const newAttendance = { ...attendance }
    students.forEach(s => {
      newAttendance[s.id] = status
    })
    setAttendance(newAttendance)
    toast({ title: "Marcado Masivo", description: `${status} a todos.` })
  }

  const handleSave = async () => {
    const records = Object.entries(attendance).filter(([_, estado]) => estado !== null);
    
    if (records.length === 0) {
      return toast({ variant: "destructive", title: "Lista vacía" })
    }
    
    if (!periodoId) {
      return toast({ variant: "destructive", title: "Error", description: "Falta ID de periodo." })
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
      toast({ title: "¡Guardado!", description: "La asistencia se registró correctamente." })
      router.push('/instructor')
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
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
      toast({ variant: "destructive", title: "Error de IA", description: "No hay datos suficientes." })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const filteredStudents = students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="h-10 text-primary font-bold">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel
        </Button>
        
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          <div className="space-y-3 w-full lg:w-auto">
            <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tighter text-slate-900 leading-tight">Pase de Lista</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border shadow-sm">
                <Label className="text-[9px] font-black uppercase text-slate-400">Fecha:</Label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="bg-transparent border-none font-bold text-sm text-slate-700 outline-none w-32" 
                />
              </div>
              {isSyncing && <RefreshCcw className="h-4 w-4 animate-spin text-primary opacity-50" />}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Button variant="outline" className="flex-1 lg:flex-none h-12 px-6 gap-2 text-accent font-bold" onClick={runAnalysis} disabled={isAnalyzing}>
              <Sparkles className={`h-5 w-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Análisis IA
            </Button>
            <Button className="flex-1 lg:flex-none h-12 px-8 gap-2 font-black shadow-lg shadow-primary/20" onClick={handleSave}>
              <Save className="h-5 w-5" /> Guardar Cambios
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Cargando...</p>
          </div>
        ) : (
          <>
            <div className="p-4 md:p-6 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <Button variant="outline" size="sm" className="h-10 border-green-200 text-green-700 font-black text-[10px]" onClick={() => handleMassive('Presente')}>P a Todos</Button>
                <Button variant="outline" size="sm" className="h-10 border-amber-200 text-amber-700 font-black text-[10px]" onClick={() => handleMassive('Tarde')}>T a Todos</Button>
                <Button variant="outline" size="sm" className="h-10 border-red-200 text-red-700 font-black text-[10px]" onClick={() => handleMassive('Falta')}>F a Todos</Button>
                <Button variant="outline" size="sm" className="h-10 border-blue-200 text-blue-700 font-black text-[10px]" onClick={() => handleMassive('Justificado')}>J a Todos</Button>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar estudiante..." 
                  className="pl-10 h-11 bg-white border-none rounded-xl text-sm shadow-sm"
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
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Estudiante</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-slate-400">Estado</TableHead>
                      <TableHead className="text-right pr-8 font-black text-[10px] uppercase tracking-widest text-slate-400">Marcar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((s) => (
                      <TableRow key={s.id} className="hover:bg-slate-50/30 transition-colors border-slate-50">
                        <TableCell className="pl-8 py-4">
                          <Avatar className="h-11 w-11 border-2 border-white shadow-sm ring-2 ring-slate-100">
                            <AvatarFallback className="bg-primary/5 text-primary font-black text-xs">
                              {getInitials(s.nombre)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-sm text-slate-900">{s.nombre}</div>
                          <div className="text-[10px] text-slate-400 font-mono">DNI: {s.dni}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          {attendance[s.id] ? (
                            <Badge className={`uppercase text-[9px] font-black tracking-widest px-3 py-1 ${
                              attendance[s.id] === 'Presente' ? 'bg-green-100 text-green-700' : attendance[s.id] === 'Falta' ? 'bg-red-100 text-red-700' : attendance[s.id] === 'Tarde' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {attendance[s.id]}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-dashed text-slate-300 text-[9px] uppercase font-bold">Pendiente</Badge>
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
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}

function ActionBtn({ icon: Icon, active, color, onClick, label }: any) {
  const themes: any = {
    green: active ? "bg-green-600 text-white shadow-md scale-110" : "hover:bg-green-50 text-slate-400 hover:text-green-600",
    amber: active ? "bg-amber-500 text-white shadow-md scale-110" : "hover:bg-amber-50 text-slate-400 hover:text-amber-600",
    red: active ? "bg-red-600 text-white shadow-md scale-110" : "hover:bg-red-50 text-slate-400 hover:text-red-600",
    blue: active ? "bg-blue-600 text-white shadow-md scale-110" : "hover:bg-blue-50 text-slate-400 hover:text-blue-600",
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
