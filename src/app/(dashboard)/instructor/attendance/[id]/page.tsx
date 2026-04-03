
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

const REVERSE_STATUS_MAP: Record<string, string> = {
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
  
  // Fecha ajustada a Perú (Lima)
  const [date, setDate] = React.useState(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  })

  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<AttendanceInsightsOutput | null>(null)

  const fetchExistingAttendance = React.useCallback(async () => {
    if (!params.id || !date) return
    setIsSyncing(true)
    try {
      // Intentamos obtener el reporte para este día específico
      const existing = await api.get<any[]>(`/asistencias/reporte/unidad/${params.id}?fecha_inicio=${date}&fecha_fin=${date}`)
      
      if (existing && Array.isArray(existing) && existing.length > 0) {
        const mapped = Object.fromEntries(
          existing.map(reg => [reg.alumno_id, REVERSE_STATUS_MAP[reg.estado] || null])
        )
        setAttendance(prev => ({ ...prev, ...mapped }))
        toast({ title: "Datos cargados", description: `Se encontró asistencia registrada para el día ${date}.` })
      } else {
        // Limpiar si no hay registros para ese día
        setAttendance(prev => {
          const reset = { ...prev }
          Object.keys(reset).forEach(key => reset[key] = null)
          return reset
        })
      }
    } catch (err) {
      console.error("No se pudo cargar la asistencia previa:", err)
    } finally {
      setIsSyncing(false)
    }
  }, [params.id, date])

  const fetchStudents = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>(`/me/unidades/${params.id}/alumnos`)
      setStudents(data)
      setAttendance(Object.fromEntries(data.map(s => [s.id, null])))
      // Una vez cargados los alumnos, buscamos si ya tienen asistencia ese día
      await fetchExistingAttendance()
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: err.message || "No se pudo cargar la lista de alumnos." 
      })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, fetchExistingAttendance])

  React.useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Refrescar cuando cambie la fecha
  React.useEffect(() => {
    if (!isLoading) {
      fetchExistingAttendance()
    }
  }, [date, fetchExistingAttendance, isLoading])

  const handleStatus = (id: string, status: string) => setAttendance(p => ({ ...p, [id]: status }))
  
  const handleMassive = (status: string) => {
    setAttendance(Object.fromEntries(students.map(s => [s.id, status])))
    toast({ title: "Marcado Masivo", description: `Todos marcados como: ${status}` })
  }

  const handleSave = async () => {
    const incomplete = Object.values(attendance).some(v => v === null)
    if (incomplete) {
      return toast({ 
        variant: "destructive", 
        title: "Pase incompleto", 
        description: "Por favor, marque la asistencia de todos los alumnos." 
      })
    }
    
    if (!periodoId) {
      return toast({ 
        variant: "destructive", 
        title: "Error de Periodo", 
        description: "El ID del ciclo académico no está presente." 
      })
    }

    const payload = {
      unidad_id: params.id as string,
      periodo_id: periodoId,
      fecha: date,
      registros: Object.entries(attendance).map(([studentId, estado]) => ({
        alumno_id: studentId,
        estado: STATUS_MAP[estado as string] || estado
      }))
    }

    try {
      await api.post('/asistencias/pase-lista', payload)
      toast({ 
        title: "¡Guardado!", 
        description: `Asistencia del ${date} registrada con éxito.` 
      })
      router.push('/instructor')
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error al guardar", 
        description: err.message || "Ocurrió un error en el servidor."
      })
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
        courseUnitName: "Unidad Didáctica",
        date: "Histórico",
        status: h.faltas > 3 ? "Falta" : "Presente"
      }))

      const result = await aiAttendanceInsights({ 
        attendanceRecords: records as any, 
        analysisContext: `Análisis crítico para la unidad ${params.id}.` 
      })
      setAiResult(result)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de IA", description: "No se pudo generar el análisis." })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="h-10 hover:bg-slate-200 -ml-2 text-primary font-bold">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel
        </Button>
        
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          <div className="space-y-3 w-full lg:w-auto">
            <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tighter text-slate-900 leading-tight">Pase de Lista</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="font-black bg-primary/5 text-primary border-primary/20 px-4 py-1.5 uppercase text-[10px]">
                UD: {params.id.toString().substring(0,8)}
              </Badge>
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                <Label className="text-[9px] font-black uppercase text-slate-400">Fecha Perú:</Label>
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
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full lg:w-auto">
            <Button variant="outline" className="flex-1 lg:flex-none h-12 px-6 gap-2 text-accent border-accent/20 font-bold text-sm" onClick={runAnalysis} disabled={isAnalyzing}>
              <Sparkles className={`h-5 w-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? "Analizando..." : "Análisis IA"}
            </Button>
            <Button className="flex-1 lg:flex-none h-12 px-8 gap-2 font-black shadow-lg shadow-primary/20 text-sm" onClick={handleSave}>
              <Save className="h-5 w-5" /> Guardar Pase
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Sincronizando padrón...</p>
          </div>
        ) : (
          <>
            <div className="p-4 md:p-6 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <Button variant="outline" size="sm" className="h-10 border-green-200 text-green-700 hover:bg-green-50 font-black text-[10px] px-4" onClick={() => handleMassive('Presente')}>P a Todos</Button>
                <Button variant="outline" size="sm" className="h-10 border-amber-200 text-amber-700 hover:bg-amber-50 font-black text-[10px] px-4" onClick={() => handleMassive('Tarde')}>T a Todos</Button>
                <Button variant="outline" size="sm" className="h-10 border-red-200 text-red-700 hover:bg-red-50 font-black text-[10px] px-4" onClick={() => handleMassive('Falta')}>F a Todos</Button>
                <Button variant="outline" size="sm" className="h-10 border-blue-200 text-blue-700 hover:bg-blue-50 font-black text-[10px] px-4" onClick={() => handleMassive('Justificado')}>J a Todos</Button>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Filtrar alumno..." 
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
                      <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-slate-400">Estado Actual</TableHead>
                      <TableHead className="text-right pr-8 font-black text-[10px] uppercase tracking-widest text-slate-400">Registrar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map((s) => (
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
                          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">DNI: {s.dni}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          {!attendance[s.id] ? (
                            <Badge variant="outline" className="border-dashed text-slate-300 text-[9px] uppercase font-bold">Pendiente</Badge>
                          ) : (
                            <Badge className={`uppercase text-[9px] font-black tracking-widest px-3 py-1 ${
                              attendance[s.id] === 'Presente' ? 'bg-green-100 text-green-700' : attendance[s.id] === 'Falta' ? 'bg-red-100 text-red-700' : attendance[s.id] === 'Tarde' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {attendance[s.id]}
                            </Badge>
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
      className={`h-10 w-10 rounded-full transition-all border-slate-100 shrink-0 relative group ${themes[color]}`}
    >
      <Icon className="h-4 w-4" />
      {!active && <span className="absolute -top-1 -right-1 bg-white text-[8px] font-black border rounded px-1 opacity-0 group-hover:opacity-100">{label}</span>}
    </Button>
  )
}
