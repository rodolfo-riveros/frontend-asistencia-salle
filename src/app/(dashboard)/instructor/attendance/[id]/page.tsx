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
      // Dummy records for simulation based on current state
      const records = students.map(s => ({
        studentId: s.id,
        studentName: s.name,
        courseUnitId: params.id as string,
        courseUnitName: "Curso Demo",
        date: new Date().toISOString().split('T')[0],
        status: s.status as any
      }))

      const result = await aiAttendanceInsights({
        attendanceRecords: records,
        analysisContext: `Unidad Didáctica: ${params.id}`
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
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-primary">Pase de Lista</h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Badge variant="outline">{params.id}</Badge>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium"><CalendarIcon className="h-4 w-4" /> {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2 text-accent border-accent/30 hover:bg-accent/5" onClick={analyzeAttendance} disabled={isAnalyzing}>
              <Sparkles className="h-4 w-4" />
              {isAnalyzing ? "Analizando..." : "Insights con IA"}
            </Button>
            <Button className="gap-2" onClick={handleSave}>
              <Save className="h-4 w-4" /> Guardar Sesión
            </Button>
          </div>
        </div>
      </div>

      {aiResult && (
        <Card className="border-accent/20 bg-accent/5 shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <CardHeader className="bg-accent text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <CardTitle className="text-lg">Análisis Predictivo de la Sesión</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setAiResult(null)} className="text-white hover:bg-white/10">Cerrar</Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <h4 className="font-bold text-accent mb-1 uppercase text-xs tracking-wider">Resumen</h4>
              <p className="text-sm leading-relaxed">{aiResult.summary}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg border">
                <h4 className="font-bold text-accent mb-2 text-xs uppercase tracking-wider">Tendencias</h4>
                <ul className="text-xs space-y-1.5 list-disc pl-4">
                  {aiResult.trends.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <h4 className="font-bold text-accent mb-2 text-xs uppercase tracking-wider">Acciones Sugeridas</h4>
                <ul className="text-xs space-y-1.5 list-disc pl-4">
                  {aiResult.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/5 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre de alumno..." 
              className="pl-9 h-11 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="hidden sm:flex items-center gap-2">
             <Badge variant="secondary" className="px-3 py-1 bg-green-100 text-green-700">Presentes: {students.filter(s => s.status === 'Presente').length}</Badge>
             <Badge variant="secondary" className="px-3 py-1 bg-red-100 text-red-700">Faltas: {students.filter(s => s.status === 'Falta').length}</Badge>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead className="w-[80px]"></TableHead>
                <TableHead>Nombre del Alumno</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones de Marcado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id} className="hover:bg-accent/5">
                  <TableCell>
                    <Avatar className="h-10 w-10 border shadow-sm">
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback>{student.name[0]}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-xs text-muted-foreground uppercase">{student.id}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={student.status} />
                  </TableCell>
                  <TableCell className="text-right">
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
    <Badge variant="outline" className={`${styles[status] || ""} px-3 font-semibold`}>
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
      className={`h-9 w-9 rounded-full transition-all border-2 ${active ? config.activeColor : `bg-white ${config.color}`} `}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{config.label}</span>
    </Button>
  )
}
