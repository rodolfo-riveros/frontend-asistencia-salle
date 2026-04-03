
"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, Search, Save, Sparkles, UserCheck, UserX, Clock, MessageSquareQuote, 
  Loader2, RefreshCcw, PieChart as PieIcon, BarChart3, AlertTriangle 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { aiAttendanceInsights, type AttendanceInsightsOutput } from "@/ai/flows/ai-attendance-insights"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { api } from "@/lib/api"
import { getInitials } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"

const STATUS_MAP: Record<string, string> = { 'Presente': 'P', 'Falta': 'F', 'Tarde': 'T', 'Justificado': 'J' }
const REVERSE_MAP: Record<string, string> = { 'P': 'Presente', 'F': 'Falta', 'T': 'Tarde', 'J': 'Justificado' }
const COLORS = { Presente: '#10b981', Falta: '#ef4444', Tarde: '#f59e0b', Justificado: '#3b82f6' }

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
    const now = new Date();
    return new Date(now.getTime() - (5 * 60 * 60 * 1000)).toISOString().split('T')[0];
  })
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<AttendanceInsightsOutput | null>(null)

  const fetchExistingAttendance = React.useCallback(async (studentList: any[]) => {
    if (!params.id || !date || studentList.length === 0) return
    setIsSyncing(true)
    try {
      const existing = await api.get<any[]>(`/asistencias/reporte/unidad/${params.id}?fecha_inicio=${date}&fecha_fin=${date}`)
      const mapped: Record<string, string | null> = {}
      studentList.forEach(s => mapped[s.id] = null)
      if (existing && Array.isArray(existing)) {
        existing.forEach(reg => {
          const idAlumno = reg.alumno_id || reg.id_alumno;
          if (idAlumno && mapped[idAlumno] !== undefined) {
            mapped[idAlumno] = REVERSE_MAP[reg.estado] || reg.estado
          }
        })
      }
      setAttendance(mapped)
    } catch (err) {
      console.error(err)
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
      toast({ variant: "destructive", title: "Error", description: "Fallo al cargar alumnos." })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, fetchExistingAttendance])

  React.useEffect(() => { fetchStudents() }, [fetchStudents])

  const handleStatus = (id: string, status: string) => setAttendance(p => ({ ...p, [id]: status }))
  const handleMassive = (status: string) => {
    const next = { ...attendance }; students.forEach(s => next[s.id] = status); setAttendance(next)
    toast({ title: "Marcado Masivo", description: `Todo el salón como ${status}.` })
  }

  const handleSave = async () => {
    const records = Object.entries(attendance).filter(([_, st]) => st !== null);
    if (!records.length) return toast({ variant: "destructive", title: "Sin cambios" })
    const payload = {
      unidad_id: params.id as string, periodo_id: periodoId, fecha: date,
      registros: records.map(([id, st]) => ({ alumno_id: id, estado: STATUS_MAP[st as string] || st }))
    }
    try {
      await api.post('/asistencias/pase-lista', payload)
      toast({ title: "¡Guardado!", description: "Sincronización exitosa." })
      router.push('/instructor')
    } catch (err: any) { toast({ variant: "destructive", title: "Error", description: err.message }) }
  }

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const history = await api.get<any[]>(`/asistencias/reporte/unidad/${params.id}`)
      const records = history.map(h => ({
        studentId: h.alumno_id || h.id_alumno,
        studentName: h.alumno,
        courseUnitId: params.id as string,
        courseUnitName: "UD",
        date: h.fecha,
        status: REVERSE_MAP[h.estado] || h.estado
      }))
      const result = await aiAttendanceInsights({ attendanceRecords: records as any })
      setAiResult(result); toast({ title: "IA Completada" })
    } catch (e) { toast({ variant: "destructive", title: "Sin datos" }) } finally { setIsAnalyzing(false) }
  }

  const statsData = React.useMemo(() => {
    const counts = { Presente: 0, Falta: 0, Tarde: 0, Justificado: 0 }
    Object.values(attendance).forEach(v => { if (v) counts[v as keyof typeof counts]++ })
    return Object.entries(counts).map(([name, value]) => ({ name, value, fill: COLORS[name as keyof typeof COLORS] })).filter(d => d.value > 0)
  }, [attendance])

  const filtered = students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6 md:space-y-10 pb-20">
      {/* HEADER SECTION */}
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="h-10 text-primary font-bold">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          <div className="space-y-3">
            <h2 className="text-3xl md:text-5xl font-headline font-black tracking-tighter text-slate-900 leading-tight">Control de Asistencia</h2>
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border shadow-sm w-fit">
              <Label className="text-[9px] font-black uppercase text-slate-400">Fecha:</Label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent border-none font-bold text-sm outline-none" />
              {isSyncing && <RefreshCcw className="h-3 w-3 animate-spin text-primary" />}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Button variant="outline" className="flex-1 h-12 px-6 gap-2 text-accent font-bold" onClick={runAnalysis} disabled={isAnalyzing}>
              <Sparkles className={`h-5 w-5 ${isAnalyzing ? 'animate-spin' : ''}`} /> Diagnóstico IA
            </Button>
            <Button className="flex-1 h-12 px-8 gap-2 font-black shadow-lg" onClick={handleSave}>
              <Save className="h-5 w-5" /> Guardar Lista
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* TABLE SECTION */}
        <Card className="lg:col-span-2 border-none shadow-xl overflow-hidden bg-white">
          <div className="p-6 bg-slate-50/80 border-b flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-9 px-3 border-green-200 text-green-700 font-bold text-[10px]" onClick={() => handleMassive('Presente')}>P TODO</Button>
              <Button variant="outline" size="sm" className="h-9 px-3 border-amber-200 text-amber-700 font-bold text-[10px]" onClick={() => handleMassive('Tarde')}>T TODO</Button>
              <Button variant="outline" size="sm" className="h-9 px-3 border-red-200 text-red-700 font-bold text-[10px]" onClick={() => handleMassive('Falta')}>F TODO</Button>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar alumno..." className="pl-10 h-10 border-none rounded-xl bg-white shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <CardContent className="p-0">
            {isLoading ? <div className="p-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div> : (
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-none">
                      <TableHead className="w-[80px] pl-8">Avatar</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-slate-400">Apellidos y Nombres</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase text-slate-400">Estado</TableHead>
                      <TableHead className="text-right pr-8 font-black text-[10px] uppercase text-slate-400">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => (
                      <TableRow key={s.id} className="hover:bg-slate-50/30 border-slate-50 group">
                        <TableCell className="pl-8 py-4">
                          <Avatar className="h-10 w-10 border shadow-sm ring-primary/5 transition-all group-hover:ring-primary/20">
                            <AvatarFallback className="bg-primary/5 text-primary font-black text-xs uppercase">{getInitials(s.nombre)}</AvatarFallback>
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
                              attendance[s.id] === 'Tarde' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>{attendance[s.id]}</Badge>
                          ) : <Badge variant="outline" className="text-slate-300 text-[9px] uppercase font-bold">Pendiente</Badge>}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-1.5">
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
            )}
          </CardContent>
        </Card>

        {/* STATS SECTION */}
        <div className="space-y-8">
          <Card className="border-none shadow-xl bg-white p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2"><PieIcon className="h-5 w-5 text-primary" /> Distribución</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={statsData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">{statsData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {statsData.map((it, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-bold">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: it.fill }} />
                    <span className="text-slate-500 uppercase">{it.name}: {it.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-500" /> Histograma</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData}><XAxis dataKey="name" hide /><YAxis hide /><Tooltip /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{statsData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI SECTION */}
      {aiResult && (
        <Card className="border-none shadow-2xl bg-slate-900 text-white p-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="h-6 w-6 text-yellow-400" />
            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Diagnóstico Estratégico de IA</h3>
          </div>
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-blue-400">Resumen Situacional</Label>
                <p className="text-blue-50/90 leading-relaxed font-medium">{aiResult.summary}</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-red-500" />
                  <Label className="text-[10px] font-black uppercase text-red-400 tracking-widest">Riesgo de Deserción ({'≥'} 30% Faltas)</Label>
                </div>
                {aiResult.atRiskStudents.length > 0 ? aiResult.atRiskStudents.map((st, i) => (
                  <div key={i} className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
                    <div><p className="font-bold text-sm">{st.name}</p><p className="text-xs text-red-200/60 mt-1">{st.reason}</p></div>
                    <Badge className="bg-red-500 font-black">{st.absencePercentage}%</Badge>
                  </div>
                )) : <p className="text-xs text-emerald-400">Sin riesgos críticos detectados.</p>}
              </div>
            </div>
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /><Label className="text-[10px] font-black uppercase text-amber-400">Advertencia Temprana: Tardanzas</Label></div>
                {aiResult.warningStudents.length > 0 ? aiResult.warningStudents.map((st, i) => (
                  <div key={i} className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between"><p className="font-bold text-sm">{st.name}</p><Badge variant="outline" className="text-amber-500 border-amber-500/40 text-[10px]">{st.tardyCount} Tardanzas</Badge></div>
                    <div className="p-3 bg-white/5 rounded-lg text-[11px] text-white/80">{st.suggestion}</div>
                  </div>
                )) : <p className="text-xs text-emerald-400">Sin patrones de tardanza preocupantes.</p>}
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <Label className="text-[10px] font-black uppercase text-emerald-400">Recomendaciones del Consultor</Label>
                <ul className="space-y-3">{aiResult.recommendations.map((r, i) => <li key={i} className="flex gap-3 text-sm text-blue-50/80"><span className="font-black text-emerald-500">✓</span>{r}</li>)}</ul>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function ActionBtn({ icon: Icon, active, color, onClick }: any) {
  const styles: any = {
    green: active ? "bg-green-600 text-white scale-110" : "text-slate-400 hover:text-green-600",
    amber: active ? "bg-amber-500 text-white scale-110" : "text-slate-400 hover:text-amber-600",
    red: active ? "bg-red-600 text-white scale-110" : "text-slate-400 hover:text-red-600",
    blue: active ? "bg-blue-600 text-white scale-110" : "text-slate-400 hover:text-blue-600",
  }
  return <Button size="icon" variant="outline" onClick={onClick} className={`h-9 w-9 rounded-full border-slate-100 ${styles[color]}`}><Icon className="h-4 w-4" /></Button>
}
