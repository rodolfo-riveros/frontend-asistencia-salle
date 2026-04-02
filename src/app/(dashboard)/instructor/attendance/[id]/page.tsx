
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
  Users,
  AlertTriangle,
  UserMinus,
  CheckCircle2
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

const MOCK_STUDENTS = [
  { id: "S101", name: "Alvarez, Mateo", avatar: "https://picsum.photos/seed/s1/200/200" },
  { id: "S102", name: "Benitez, Sofía", avatar: "https://picsum.photos/seed/s2/200/200" },
  { id: "S103", name: "Castillo, Jorge", avatar: "https://picsum.photos/seed/s3/200/200" },
  { id: "S104", name: "Díaz, Valentina", avatar: "https://picsum.photos/seed/s4/200/200" },
  { id: "S105", name: "Espinoza, Rodrigo", avatar: "https://picsum.photos/seed/s5/200/200" },
  { id: "S106", name: "Flores, Camila", avatar: "https://picsum.photos/seed/s6/200/200" },
]

export default function AttendancePage() {
  const params = useParams()
  const router = useRouter()
  const [attendance, setAttendance] = React.useState<Record<string, string | null>>(
    Object.fromEntries(MOCK_STUDENTS.map(s => [s.id, null]))
  )
  const [searchTerm, setSearchTerm] = React.useState("")
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0])
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<AttendanceInsightsOutput | null>(null)

  const handleStatus = (id: string, status: string) => setAttendance(p => ({ ...p, [id]: status }))
  
  const handleMassive = (status: string) => {
    setAttendance(Object.fromEntries(MOCK_STUDENTS.map(s => [s.id, status])))
    toast({ title: "Marcado Masivo", description: `Todos marcados como: ${status}` })
  }

  const handleSave = () => {
    const incomplete = Object.values(attendance).some(v => v === null)
    if (incomplete) return toast({ variant: "destructive", title: "Error", description: "Faltan alumnos por marcar." })
    toast({ title: "Éxito", description: "Asistencia guardada correctamente." })
  }

  const runAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const history = MOCK_STUDENTS.flatMap(s => [
        { studentId: s.id, studentName: s.name, courseUnitId: "UD-01", courseUnitName: "Curso", date: "2024-03-01", status: Math.random() > 0.3 ? "Presente" : "Falta" },
        { studentId: s.id, studentName: s.name, courseUnitId: "UD-01", courseUnitName: "Curso", date: date, status: attendance[s.id] || "Presente" }
      ])
      const result = await aiAttendanceInsights({ attendanceRecords: history as any, analysisContext: `Análisis de riesgo del 30% para ${params.id}` })
      setAiResult(result)
    } catch (e) {
      toast({ variant: "destructive", title: "IA Error", description: "No se pudo conectar con el motor de IA." })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="h-10 hover:bg-slate-100">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
        
        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div className="space-y-3">
            <h2 className="text-4xl font-headline font-black tracking-tighter text-slate-900">Pase de Lista</h2>
            <div className="flex flex-wrap items-center gap-4">
              <Badge variant="outline" className="font-black bg-primary/5 text-primary border-primary/20 px-4 py-1 uppercase">{params.id}</Badge>
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                <Label className="text-[9px] font-black uppercase text-slate-400">Fecha:</Label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent border-none font-bold text-slate-700 outline-none" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-12 px-6 gap-2 text-accent border-accent/20 font-bold" onClick={runAnalysis} disabled={isAnalyzing}>
              <Sparkles className={`h-5 w-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? "Analizando..." : "Predecir Deserción (IA)"}
            </Button>
            <Button className="h-12 px-8 gap-2 font-black shadow-lg shadow-primary/20" onClick={handleSave}>
              <Save className="h-5 w-5" /> Guardar
            </Button>
          </div>
        </div>
      </div>

      {aiResult && (
        <Card className="border-none shadow-2xl bg-slate-900 text-white overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="bg-white/5 p-6 border-b border-white/10 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <CardTitle className="text-xl font-bold">Análisis de Deserción Escolar</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setAiResult(null)} className="text-white">Ocultar</Button>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiResult.atRiskStudents.map((s, i) => (
                <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                  <div className="flex justify-between font-bold">
                    <span>{s.name}</span>
                    <Badge className="bg-red-500/80">{s.absencePercentage}%</Badge>
                  </div>
                  <p className="text-xs text-blue-200/60 leading-relaxed">{s.reason}</p>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-white/5">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Tendencias</h4>
                <ul className="space-y-2 text-sm text-blue-50/70">
                  {aiResult.trends.map((t, i) => <li key={i} className="flex gap-2"><span>•</span>{t}</li>)}
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Recomendaciones</h4>
                <ul className="space-y-2 text-sm text-emerald-50/70">
                  {aiResult.recommendations.map((r, i) => <li key={i} className="flex gap-2"><span>•</span>{r}</li>)}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-xl bg-white overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-10 border-green-200 text-green-700 hover:bg-green-50 font-bold" onClick={() => handleMassive('Presente')}>P a Todos</Button>
            <Button variant="outline" className="h-10 border-amber-200 text-amber-700 hover:bg-amber-50 font-bold" onClick={() => handleMassive('Tarde')}>T a Todos</Button>
            <Button variant="outline" className="h-10 border-red-200 text-red-700 hover:bg-red-50 font-bold" onClick={() => handleMassive('Falta')}>F a Todos</Button>
            <Button variant="outline" className="h-10 border-blue-200 text-blue-700 hover:bg-blue-50 font-bold" onClick={() => handleMassive('Justificado')}>J a Todos</Button>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar estudiante..." 
              className="pl-10 h-10 bg-slate-50 border-none rounded-lg"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none">
                <TableHead className="w-[80px] pl-8"></TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Estudiante</TableHead>
                <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-slate-400">Estado</TableHead>
                <TableHead className="text-right pr-8 font-black text-[10px] uppercase tracking-widest text-slate-400">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_STUDENTS.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((s) => (
                <TableRow key={s.id} className="hover:bg-slate-50/30 transition-colors border-slate-50">
                  <TableCell className="pl-8 py-4">
                    <div className="relative">
                      <Avatar className="h-10 w-10 border shadow-sm">
                        <AvatarImage src={s.avatar} />
                        <AvatarFallback>{s.name[0]}</AvatarFallback>
                      </Avatar>
                      {attendance[s.id] && (
                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[8px] text-white shadow-sm ${
                          attendance[s.id] === 'Presente' ? 'bg-green-500' : attendance[s.id] === 'Falta' ? 'bg-red-500' : 'bg-amber-500'
                        }`}><CheckCircle2 className="h-2 w-2" /></div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">ID: {s.id}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    {!attendance[s.id] ? (
                      <Badge variant="outline" className="border-dashed text-slate-300">Pendiente</Badge>
                    ) : (
                      <Badge className={`uppercase text-[9px] font-black tracking-widest ${
                        attendance[s.id] === 'Presente' ? 'bg-green-100 text-green-700' : attendance[s.id] === 'Falta' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {attendance[s.id]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-2">
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
        </CardContent>
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
    <Button size="icon" variant="outline" onClick={onClick} className={`h-10 w-10 rounded-full transition-all border-slate-100 ${themes[color]}`}>
      <Icon className="h-4 w-4" />
    </Button>
  )
}
