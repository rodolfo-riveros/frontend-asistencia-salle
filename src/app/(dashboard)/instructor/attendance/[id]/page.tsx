
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
  MessageSquareQuote
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { aiAttendanceInsights, type AttendanceInsightsOutput } from "@/ai/flows/ai-attendance-insights"

const initialStudents = [
  { id: "S101", name: "Alvarez, Mateo", avatar: "https://picsum.photos/seed/s1/200/200", status: "Presente" },
  { id: "S102", name: "Benitez, Sofía", avatar: "https://picsum.photos/seed/s2/200/200", status: "Presente" },
  { id: "S103", name: "Castillo, Jorge", avatar: "https://picsum.photos/seed/s3/200/200", status: "Presente" },
  { id: "S104", name: "Díaz, Valentina", avatar: "https://picsum.photos/seed/s4/200/200", status: "Tarde" },
  { id: "S105", name: "Espinoza, Rodrigo", avatar: "https://picsum.photos/seed/s5/200/200", status: "Falta" },
  { id: "S106", name: "Flores, Camila", avatar: "https://picsum.photos/seed/s6/200/200", status: "Presente" },
  { id: "S107", name: "García, Leonardo", avatar: "https://picsum.photos/seed/s7/200/200", status: "Justificado" },
  { id: "S108", name: "Huamán, Elena", avatar: "https://picsum.photos/seed/s8/200/200", status: "Presente" },
]

export default function AttendancePage() {
  const params = useParams()
  const router = useRouter()
  const [students, setStudents] = React.useState(initialStudents)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<AttendanceInsightsOutput | null>(null)

  const handleStatusChange = (studentId: string, newStatus: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s))
  }

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSave = () => {
    toast({
      title: "Asistencia guardada",
      description: "Los cambios se han registrado correctamente en el sistema.",
    })
  }

  const analyzeAttendance = async () => {
    setIsAnalyzing(true)
    try {
      const records = students.map(s => ({
        studentId: s.id,
        studentName: s.name,
        courseUnitId: params.id as string,
        courseUnitName: "Unidad Didáctica Seleccionada",
        date: new Date().toISOString().split('T')[0],
        status: s.status as any
      }))

      const result = await aiAttendanceInsights({
        attendanceRecords: records,
        analysisContext: `Análisis de la sesión para el curso ${params.id}`
      })
      setAiResult(result)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al analizar",
        description: "No se pudo conectar con el motor de IA.",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mis cursos
        </Button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-primary">Pase de Lista</h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Badge variant="outline" className="font-bold border-primary/20 text-primary">{params.id}</Badge>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium"><CalendarIcon className="h-4 w-4" /> {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 text-accent border-accent/30 hover:bg-accent/5 h-11" onClick={analyzeAttendance} disabled={isAnalyzing}>
              <Sparkles className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? "Analizando..." : "Insights con IA"}
            </Button>
            <Button className="gap-2 h-11 px-6 shadow-lg shadow-primary/20" onClick={handleSave}>
              <Save className="h-4 w-4" /> Guardar Sesión
            </Button>
          </div>
        </div>
      </div>

      {aiResult && (
        <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-blue-900 text-white overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="bg-white/10 p-4 flex flex-row items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              <CardTitle className="text-lg font-bold">Análisis Predictivo de la Sesión</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setAiResult(null)} className="text-white hover:bg-white/10">Ocultar</Button>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-1">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">Resumen de IA</h4>
              <p className="text-sm leading-relaxed text-blue-50/90 font-medium">{aiResult.summary}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300 mb-3 flex items-center gap-2">
                   <ClockIcon className="h-3 w-3" /> Tendencias
                </h4>
                <ul className="text-xs space-y-2">
                  {aiResult.trends.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <div className="h-1 w-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-3 flex items-center gap-2">
                   <MessageSquareQuote className="h-3 w-3" /> Sugerencias
                </h4>
                <ul className="text-xs space-y-2">
                  {aiResult.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2 text-emerald-50/80">
                      <div className="h-1 w-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por nombre de alumno..." 
              className="pl-9 h-11 bg-white border-slate-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
             <Badge variant="secondary" className="px-4 py-2 bg-green-50 text-green-700 border-green-100 whitespace-nowrap">Presentes: {students.filter(s => s.status === 'Presente').length}</Badge>
             <Badge variant="secondary" className="px-4 py-2 bg-red-50 text-red-700 border-red-100 whitespace-nowrap">Faltas: {students.filter(s => s.status === 'Falta').length}</Badge>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px] pl-6"></TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Estudiante</TableHead>
                <TableHead className="text-center font-bold text-slate-400 uppercase text-[10px] tracking-widest">Estado</TableHead>
                <TableHead className="text-right font-bold text-slate-400 uppercase text-[10px] tracking-widest pr-6">Marcar Asistencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="pl-6">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback>{student.name[0]}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-900">{student.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono tracking-tighter">CÓDIGO: {student.id}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={student.status} />
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-1.5">
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "Presente": "bg-green-100 text-green-700 border-green-200",
    "Tarde": "bg-amber-100 text-amber-700 border-amber-200",
    "Falta": "bg-red-100 text-red-700 border-red-200",
    "Justificado": "bg-blue-100 text-blue-700 border-blue-200",
  }
  return (
    <Badge variant="outline" className={`${styles[status] || ""} px-3 font-bold text-[10px] uppercase tracking-wider`}>
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
    present: { icon: UserCheck, color: "hover:bg-green-100 hover:text-green-700", activeColor: "bg-green-600 text-white", label: "P" },
    late: { icon: ClockIcon, color: "hover:bg-amber-100 hover:text-amber-700", activeColor: "bg-amber-500 text-white", label: "T" },
    absent: { icon: UserX, color: "hover:bg-red-100 hover:text-red-700", activeColor: "bg-red-600 text-white", label: "F" },
    justified: { icon: MessageSquareQuote, color: "hover:bg-blue-100 hover:text-blue-700", activeColor: "bg-blue-600 text-white", label: "J" },
  }
  const config = configs[type]
  const Icon = config.icon

  return (
    <Button 
      size="icon" 
      variant="outline" 
      onClick={onClick}
      className={`h-9 w-9 rounded-full transition-all border-2 ${active ? `${config.activeColor} border-transparent` : `bg-white ${config.color} border-slate-100`} shadow-sm`}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{config.label}</span>
    </Button>
  )
}
