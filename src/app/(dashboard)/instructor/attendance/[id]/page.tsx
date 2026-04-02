
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Search, 
  Calendar as CalendarIcon, 
  Save, 
  Sparkles,
  UserCheck,
  UserX,
  Clock as ClockIcon,
  MessageSquareQuote,
  Users,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { aiAttendanceInsights, type AttendanceInsightsOutput } from "@/ai/flows/ai-attendance-insights"
import { Label } from "@/components/ui/label"

const initialStudentsData = [
  { id: "S101", name: "Alvarez, Mateo", avatar: "https://picsum.photos/seed/s1/200/200", status: null },
  { id: "S102", name: "Benitez, Sofía", avatar: "https://picsum.photos/seed/s2/200/200", status: null },
  { id: "S103", name: "Castillo, Jorge", avatar: "https://picsum.photos/seed/s3/200/200", status: null },
  { id: "S104", name: "Díaz, Valentina", avatar: "https://picsum.photos/seed/s4/200/200", status: null },
  { id: "S105", name: "Espinoza, Rodrigo", avatar: "https://picsum.photos/seed/s5/200/200", status: null },
  { id: "S106", name: "Flores, Camila", avatar: "https://picsum.photos/seed/s6/200/200", status: null },
  { id: "S107", name: "García, Leonardo", avatar: "https://picsum.photos/seed/s7/200/200", status: null },
  { id: "S108", name: "Huamán, Elena", avatar: "https://picsum.photos/seed/s8/200/200", status: null },
]

export default function AttendancePage() {
  const params = useParams()
  const router = useRouter()
  const [students, setStudents] = React.useState(initialStudentsData)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0])
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<AttendanceInsightsOutput | null>(null)

  const handleStatusChange = (studentId: string, newStatus: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s))
  }

  const handleMassiveAttendance = (status: string) => {
    setStudents(prev => prev.map(s => ({ ...s, status })))
    toast({
      title: `Marcado Masivo: ${status}`,
      description: `Se ha marcado a todos los alumnos como ${status}.`,
    })
  }

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSave = () => {
    const unmarkedCount = students.filter(s => s.status === null).length
    if (unmarkedCount > 0) {
      toast({
        variant: "destructive",
        title: "Asistencia Incompleta",
        description: `Faltan ${unmarkedCount} alumnos por marcar.`,
      })
      return
    }
    toast({
      title: "Asistencia guardada",
      description: `La sesión del ${selectedDate} ha sido registrada correctamente.`,
    })
  }

  const analyzeAttendance = async () => {
    setIsAnalyzing(true)
    try {
      const records = students
        .filter(s => s.status !== null)
        .map(s => ({
          studentId: s.id,
          studentName: s.name,
          courseUnitId: params.id as string,
          courseUnitName: "Unidad Didáctica Seleccionada",
          date: selectedDate,
          status: s.status as any
        }))

      if (records.length === 0) {
        throw new Error("Debe marcar al menos un alumno para analizar.")
      }

      const result = await aiAttendanceInsights({
        attendanceRecords: records,
        analysisContext: `Análisis de la sesión para el curso ${params.id} en la fecha ${selectedDate}`
      })
      setAiResult(result)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al analizar",
        description: error.message || "No se pudo conectar con el motor de IA.",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header Docente */}
      <div className="flex flex-col gap-6">
        <Button variant="ghost" onClick={() => router.back()} className="w-fit hover:bg-slate-100 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mis cursos
        </Button>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-4xl font-headline font-black tracking-tight text-slate-900 leading-none">Pase de Lista</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-slate-500 font-medium">
              <Badge variant="outline" className="font-bold border-primary/20 text-primary bg-primary/5 px-3">{params.id}</Badge>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                <Label htmlFor="date-picker" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha de Sesión:</Label>
                <input 
                  id="date-picker"
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none font-bold text-slate-700 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="gap-2 text-accent border-accent/30 hover:bg-accent/5 h-12 px-6 font-bold shadow-sm" 
              onClick={analyzeAttendance} 
              disabled={isAnalyzing}
            >
              <Sparkles className={`h-5 w-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? "Analizando..." : "Insights con IA"}
            </Button>
            <Button className="gap-2 h-12 px-8 font-black shadow-lg shadow-primary/20" onClick={handleSave}>
              <Save className="h-5 w-5" /> Guardar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* IA Result Section */}
      {aiResult && (
        <Card className="border-none shadow-2xl bg-gradient-to-br from-slate-900 to-blue-900 text-white overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="bg-white/10 p-6 flex flex-row items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-400/20 p-2 rounded-xl">
                <Sparkles className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Análisis Predictivo IA</CardTitle>
                <p className="text-blue-200/60 text-[10px] font-bold uppercase tracking-widest">Motor Precision IA v2.4</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setAiResult(null)} className="text-white hover:bg-white/10">Ocultar</Button>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Diagnóstico de Sesión</h4>
              <p className="text-lg leading-relaxed text-blue-50/90 font-medium italic">"{aiResult.summary}"</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300 mb-4 flex items-center gap-2">
                   <ClockIcon className="h-4 w-4" /> Patrones Identificados
                </h4>
                <ul className="space-y-3">
                  {aiResult.trends.map((t, i) => (
                    <li key={i} className="flex gap-3 text-sm text-blue-50/80">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-4 flex items-center gap-2">
                   <CheckCircle2 className="h-4 w-4" /> Sugerencias Estratégicas
                </h4>
                <ul className="space-y-3">
                  {aiResult.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-3 text-sm text-emerald-50/80">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controles de Marcado Masivo */}
      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Marcado Masivo</h3>
            <p className="text-xs text-slate-500 font-medium">Asigna el mismo estado a todos los estudiantes con un clic.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              variant="outline" 
              className="h-11 px-6 rounded-xl border-green-200 text-green-700 hover:bg-green-50 gap-2 font-bold transition-all hover:scale-105"
              onClick={() => handleMassiveAttendance('Presente')}
            >
              <UserCheck className="h-4 w-4" /> Presentes a Todos
            </Button>
            <Button 
              variant="outline" 
              className="h-11 px-6 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 gap-2 font-bold transition-all hover:scale-105"
              onClick={() => handleMassiveAttendance('Tarde')}
            >
              <ClockIcon className="h-4 w-4" /> Tardes a Todos
            </Button>
            <Button 
              variant="outline" 
              className="h-11 px-6 rounded-xl border-red-200 text-red-700 hover:bg-red-50 gap-2 font-bold transition-all hover:scale-105"
              onClick={() => handleMassiveAttendance('Falta')}
            >
              <UserX className="h-4 w-4" /> Faltas a Todos
            </Button>
            <Button 
              variant="outline" 
              className="h-11 px-6 rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 gap-2 font-bold transition-all hover:scale-105"
              onClick={() => handleMassiveAttendance('Justificado')}
            >
              <MessageSquareQuote className="h-4 w-4" /> Justificar a Todos
            </Button>
          </div>
        </div>

        <div className="p-6 border-b flex flex-col md:flex-row items-center gap-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Buscar por nombre de alumno..." 
              className="pl-12 h-12 bg-slate-50 border-none rounded-xl text-base shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
             <Badge variant="secondary" className="px-5 py-2.5 bg-green-50 text-green-700 border-green-100 font-bold rounded-lg shadow-sm whitespace-nowrap">
              {students.filter(s => s.status === 'Presente').length} Presentes
             </Badge>
             <Badge variant="secondary" className="px-5 py-2.5 bg-red-50 text-red-700 border-red-100 font-bold rounded-lg shadow-sm whitespace-nowrap">
              {students.filter(s => s.status === 'Falta').length} Faltas
             </Badge>
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[100px] pl-8"></TableHead>
                <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] py-6">Estudiante</TableHead>
                <TableHead className="text-center font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">Estado Actual</TableHead>
                <TableHead className="text-right font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] pr-8">Marcar Asistencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} className="group hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-none">
                  <TableCell className="pl-8 py-5">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-md ring-1 ring-slate-100">
                        <AvatarImage src={student.avatar} />
                        <AvatarFallback>{student.name[0]}</AvatarFallback>
                      </Avatar>
                      {student.status && (
                        <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm ${
                          student.status === 'Presente' ? 'bg-green-500' : 
                          student.status === 'Tarde' ? 'bg-amber-500' :
                          student.status === 'Falta' ? 'bg-red-500' : 'bg-blue-500'
                        }`}>
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-900 text-base">{student.name}</div>
                    <div className="text-[10px] text-slate-400 font-black tracking-widest uppercase mt-0.5">CÓDIGO INSTITUCIONAL: {student.id}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={student.status} />
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex items-center justify-end gap-2">
                      <AttendanceAction 
                        onClick={() => handleStatusChange(student.id, 'Presente')} 
                        active={student.status === 'Presente'}
                        type="present"
                      />
                      <AttendanceAction 
                        onClick={() => handleStatusChange(student.id, 'Tarde')} 
                        active={student.status === 'Tarde'}
                        type="late"
                      />
                      <AttendanceAction 
                        onClick={() => handleStatusChange(student.id, 'Falta')} 
                        active={student.status === 'Falta'}
                        type="absent"
                      />
                      <AttendanceAction 
                        onClick={() => handleStatusChange(student.id, 'Justificado')} 
                        active={student.status === 'Justificado'}
                        type="justified"
                      />
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

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <Badge variant="outline" className="px-4 py-1.5 border-dashed border-slate-300 text-slate-300 font-bold text-[10px] uppercase tracking-widest">
        Sin Marcar
      </Badge>
    )
  }
  const styles: Record<string, string> = {
    "Presente": "bg-green-100 text-green-700 border-green-200",
    "Tarde": "bg-amber-100 text-amber-700 border-amber-200",
    "Falta": "bg-red-100 text-red-700 border-red-200",
    "Justificado": "bg-blue-100 text-blue-700 border-blue-200",
  }
  return (
    <Badge variant="outline" className={`${styles[status] || ""} px-4 py-1.5 font-black text-[10px] uppercase tracking-[0.2em] shadow-sm`}>
      {status}
    </Badge>
  )
}

function AttendanceAction({ 
  onClick, 
  active, 
  type 
}: { 
  onClick: () => void, 
  active: boolean, 
  type: 'present' | 'late' | 'absent' | 'justified' 
}) {
  const configs = {
    present: { icon: UserCheck, color: "hover:bg-green-100 hover:text-green-700", activeColor: "bg-green-600 text-white shadow-green-200", label: "P" },
    late: { icon: ClockIcon, color: "hover:bg-amber-100 hover:text-amber-700", activeColor: "bg-amber-500 text-white shadow-amber-200", label: "T" },
    absent: { icon: UserX, color: "hover:bg-red-100 hover:text-red-700", activeColor: "bg-red-600 text-white shadow-red-200", label: "F" },
    justified: { icon: MessageSquareQuote, color: "hover:bg-blue-100 hover:text-blue-700", activeColor: "bg-blue-600 text-white shadow-blue-200", label: "J" },
  }
  const config = configs[type]
  const Icon = config.icon

  return (
    <Button 
      size="icon" 
      variant="outline" 
      onClick={onClick}
      className={`h-11 w-11 rounded-full transition-all border-2 ${active ? `${config.activeColor} border-transparent shadow-lg scale-110` : `bg-white ${config.color} border-slate-100`} hover:shadow-md`}
    >
      <Icon className="h-5 w-5" />
      <span className="sr-only">{config.label}</span>
    </Button>
  )
}
