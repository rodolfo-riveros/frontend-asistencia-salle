"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Search, 
  Save, 
  Sparkles,
  UserCheck,
  UserX,
  Clock,
  MessageSquareQuote,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { aiAttendanceInsights, type AttendanceInsightsOutput } from "@/ai/flows/ai-attendance-insights"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { api } from "@/lib/api"

// Mapeo de estados para el backend (Enum P, F, T, J)
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
  const router = useRouter()
  const [students, setStudents] = React.useState<any[]>([])
  const [attendance, setAttendance] = React.useState<Record<string, string | null>>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0])
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<AttendanceInsightsOutput | null>(null)

  const fetchStudents = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>(`/me/unidades/${params.id}/alumnos`)
      setStudents(data)
      setAttendance(Object.fromEntries(data.map(s => [s.id, null])))
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: err.message || "No se pudo cargar la lista de alumnos." 
      })
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  React.useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const handleStatus = (id: string, status: string) => setAttendance(p => ({ ...p, [id]: status }))
  
  const handleMassive = (status: string) => {
    setAttendance(Object.fromEntries(students.map(s => [s.id, status])))
    toast({ title: "Marcado Masivo", description: `Todos marcados como: ${status}` })
  }

  const handleSave = async () => {
    const incomplete = Object.values(attendance).some(v => v === null)
    if (incomplete) return toast({ variant: "destructive", title: "Error", description: "Faltan alumnos por marcar." })

    const payload = {
      unidad_id: params.id as string,
      fecha: date,
      registros: Object.entries(attendance).map(([studentId, estado]) => ({
        alumno_id: studentId,
        estado: STATUS_MAP[estado as string] || estado // Convertimos a P, F, T, J
      }))
    }

    try {
      await api.post('/asistencias/pase-lista', payload)
      toast({ title: "Éxito", description: "Asistencia guardada correctamente." })
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
        courseUnitName: "Unidad Didáctica",
        date: "Histórico",
        status: h.faltas > 3 ? "Falta" : "Presente"
      }))

      const result = await aiAttendanceInsights({ 
        attendanceRecords: records as any, 
        analysisContext: `Análisis crítico para la unidad ${params.id}. Regla del 30%.` 
      })
      setAiResult(result)
    } catch (e: any) {
      toast({ variant: "destructive", title: "IA Error", description: e.message || "No se pudo conectar con el motor de IA." })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()} className="h-10 hover:bg-slate-200 -ml-2 text-primary font-bold">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
        
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          <div className="space-y-3 w-full lg:w-auto">
            <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tighter text-slate-900 leading-tight">Pase de Lista</h2>
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <Badge variant="outline" className="font-black bg-primary/5 text-primary border-primary/20 px-3 md:px-4 py-1 uppercase text-[10px] md:text-xs">{params.id}</Badge>
              <div className="flex items-center gap-2 md:gap-3 bg-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-slate-100 shadow-sm">
                <Label className="text-[8px] md:text-[9px] font-black uppercase text-slate-400">Fecha:</Label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent border-none font-bold text-xs md:text-sm text-slate-700 outline-none w-24 md:w-32" />
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full lg:w-auto">
            <Button variant="outline" className="flex-1 lg:flex-none h-10 md:h-12 px-4 md:px-6 gap-2 text-accent border-accent/20 font-bold text-xs md:text-sm" onClick={runAnalysis} disabled={isAnalyzing}>
              <Sparkles className={`h-4 w-4 md:h-5 md:w-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span className="truncate">{isAnalyzing ? "Analizando..." : "Predecir Deserción (IA)"}</span>
            </Button>
            <Button className="flex-1 lg:flex-none h-10 md:h-12 px-4 md:px-8 gap-2 font-black shadow-lg shadow-primary/20 text-xs md:text-sm" onClick={handleSave}>
              <Save className="h-4 w-4 md:h-5 md:w-5" /> Guardar Pase
            </Button>
          </div>
        </div>
      </div>

      {aiResult && (
        <Card className="border-none shadow-2xl bg-slate-900 text-white overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="bg-white/5 p-4 md:p-6 border-b border-white/10 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-red-400" />
              <CardTitle className="text-lg md:text-xl font-bold">Análisis de Deserción Escolar</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setAiResult(null)} className="text-white h-8 w-8 p-0">×</Button>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiResult.atRiskStudents.length > 0 ? aiResult.atRiskStudents.map((s, i) => (
                <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                  <div className="flex justify-between font-bold text-sm md:text-base">
                    <span className="truncate">{s.name}</span>
                    <Badge className="bg-red-500/80 text-[10px] md:text-xs ml-2">{s.absencePercentage}%</Badge>
                  </div>
                  <p className="text-[10px] md:text-xs text-blue-200/60 leading-relaxed">{s.reason}</p>
                </div>
              )) : (
                <p className="text-blue-200/60 text-sm">No se detectaron alumnos en riesgo crítico.</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
              <div className="space-y-4">
                <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-blue-400">Tendencias</h4>
                <ul className="space-y-2 text-xs md:text-sm text-blue-50/70">
                  {aiResult.trends.map((t, i) => <li key={i} className="flex gap-2"><span>•</span>{t}</li>)}
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-emerald-400">Recomendaciones</h4>
                <ul className="space-y-2 text-xs md:text-sm text-emerald-50/70">
                  {aiResult.recommendations.map((r, i) => <li key={i} className="flex gap-2"><span>•</span>{r}</li>)}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-xl bg-white overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Cargando alumnos de la unidad...</p>
          </div>
        ) : (
          <>
            <div className="p-4 md:p-6 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <Button variant="outline" className="flex-1 md:flex-none h-9 md:h-10 border-green-200 text-green-700 hover:bg-green-50 font-bold text-[10px] md:text-xs px-2" onClick={() => handleMassive('Presente')}>P a Todos</Button>
                <Button variant="outline" className="flex-1 md:flex-none h-9 md:h-10 border-amber-200 text-amber-700 hover:bg-amber-50 font-bold text-[10px] md:text-xs px-2" onClick={() => handleMassive('Tarde')}>T a Todos</Button>
                <Button variant="outline" className="flex-1 md:flex-none h-9 md:h-10 border-red-200 text-red-700 hover:bg-red-50 font-bold text-[10px] md:text-xs px-2" onClick={() => handleMassive('Falta')}>F a Todos</Button>
                <Button variant="outline" className="flex-1 md:flex-none h-9 md:h-10 border-blue-200 text-blue-700 hover:bg-blue-50 font-bold text-[10px] md:text-xs px-2" onClick={() => handleMassive('Justificado')}>J a Todos</Button>
              </div>
              <div className="relative w-full md:w-72 lg:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar estudiante..." 
                  className="pl-10 h-10 bg-slate-50 border-none rounded-lg text-sm"
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
                      <TableHead className="w-[60px] md:w-[80px] pl-4 md:pl-8"></TableHead>
                      <TableHead className="font-black text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400">Estudiante</TableHead>
                      <TableHead className="text-center font-black text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400">Estado</TableHead>
                      <TableHead className="text-right pr-4 md:pr-8 font-black text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map((s) => (
                      <TableRow key={s.id} className="hover:bg-slate-50/30 transition-colors border-slate-50">
                        <TableCell className="pl-4 md:pl-8 py-3 md:py-4">
                          <div className="relative">
                            <Avatar className="h-8 w-8 md:h-10 md:w-10 border shadow-sm">
                              <AvatarImage src={`https://picsum.photos/seed/${s.id}/200/200`} />
                              <AvatarFallback>{s.nombre[0]}</AvatarFallback>
                            </Avatar>
                            {attendance[s.id] && (
                              <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 md:h-4 md:w-4 rounded-full flex items-center justify-center text-[7px] md:text-[8px] text-white shadow-sm ${
                                attendance[s.id] === 'Presente' ? 'bg-green-500' : attendance[s.id] === 'Falta' ? 'bg-red-500' : 'bg-amber-500'
                              }`}><CheckCircle2 className="h-2 w-2 md:h-2.5 md:w-2.5" /></div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-xs md:text-sm text-slate-900 truncate max-w-[120px] md:max-w-none">{s.nombre}</div>
                          <div className="text-[8px] md:text-[10px] text-slate-400 font-mono">DNI: {s.dni}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          {!attendance[s.id] ? (
                            <Badge variant="outline" className="border-dashed text-slate-300 text-[8px] md:text-[10px] px-1 md:px-2 py-0">Pendiente</Badge>
                          ) : (
                            <Badge className={`uppercase text-[8px] md:text-[9px] font-black tracking-widest px-1.5 md:px-2 ${
                              attendance[s.id] === 'Presente' ? 'bg-green-100 text-green-700' : attendance[s.id] === 'Falta' ? 'bg-red-100 text-red-700' : attendance[s.id] === 'Tarde' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {attendance[s.id]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4 md:pr-8">
                          <div className="flex justify-end gap-1 md:gap-2">
                            <ActionBtn icon={UserCheck} active={attendance[s.id] === 'Presente'} color="green" onClick={() => handleStatus(s.id, 'Presente')} />
                            <ActionBtn icon={Clock} active={attendance[s.id] === 'Tarde'} color="amber" onClick={() => handleStatus(s.id, 'Tarde')} />
                            <ActionBtn icon={UserX} active={attendance[s.id] === 'Falta'} color="red" onClick={() => handleStatus(s.id, 'Falta')} />
                            <ActionBtn icon={MessageSquareQuote} active={attendance[s.id] === 'Justificado'} color="blue" onClick={() => handleStatus(s.id, 'Justificado')} />
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

function ActionBtn({ icon: Icon, active, color, onClick }: any) {
  const themes: any = {
    green: active ? "bg-green-600 text-white" : "hover:bg-green-50 text-slate-400 hover:text-green-600",
    amber: active ? "bg-amber-500 text-white" : "hover:bg-amber-50 text-slate-400 hover:text-amber-600",
    red: active ? "bg-red-600 text-white" : "hover:bg-red-50 text-slate-400 hover:text-red-600",
    blue: active ? "bg-blue-600 text-white" : "hover:bg-blue-50 text-slate-400 hover:text-blue-600",
  }
  return (
    <Button size="icon" variant="outline" onClick={onClick} className={`h-8 w-8 md:h-10 md:w-10 rounded-full transition-all border-slate-100 shrink-0 ${themes[color]}`}>
      <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
    </Button>
  )
}