
"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, 
  Search, 
  Save, 
  Plus, 
  Trash2, 
  ClipboardCheck, 
  FileSpreadsheet, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Settings2,
  LayoutList,
  Target,
  ChevronRight,
  GraduationCap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { getInitials } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import * as XLSX from 'xlsx'

type Column = { id: string; name: string; weight: number }
type GradeData = Record<string, Record<string, number>> // studentId -> { columnId -> value }

export default function AcademicGradebookPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [students, setStudents] = React.useState<any[]>([])
  const [columns, setColumns] = React.useState<Column[]>([
    { id: 'c1', name: 'Actividad 1', weight: 30 },
    { id: 'c2', name: 'Actividad 2', weight: 30 },
    { id: 'c3', name: 'Examen Final', weight: 40 }
  ])
  const [grades, setGrades] = React.useState<GradeData>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  
  // Instrument States
  const [isCotejoOpen, setIsCotejoOpen] = React.useState(false)
  const [isRubricaOpen, setIsRubricaOpen] = React.useState(false)
  const [activeStudent, setActiveStudent] = React.useState<any>(null)
  const [activeColumn, setActiveColumn] = React.useState<string | null>(null)

  const fetchStudents = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>(`/me/unidades/${params.id}/alumnos`)
      setStudents(data)
      
      // Initialize grades
      const initialGrades: GradeData = {}
      data.forEach(s => {
        initialGrades[s.id] = {}
        columns.forEach(c => initialGrades[s.id][c.id] = 0)
      })
      setGrades(initialGrades)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los alumnos." })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, columns])

  React.useEffect(() => { fetchStudents() }, [fetchStudents])

  const handleGradeChange = (studentId: string, columnId: string, value: string) => {
    const numValue = Math.min(20, Math.max(0, parseInt(value) || 0))
    setGrades(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [columnId]: numValue }
    }))
  }

  const calculateFinal = (studentId: string) => {
    const studentGrades = grades[studentId] || {}
    let total = 0
    columns.forEach(c => {
      total += (studentGrades[c.id] || 0) * (c.weight / 100)
    })
    return Math.round(total)
  }

  const handleExport = () => {
    const rows = students.map((s, idx) => {
      const data: any = {
        'N°': idx + 1,
        'Estudiante': s.nombre,
        'DNI': s.dni
      }
      columns.forEach(c => {
        data[c.name] = grades[s.id][c.id]
      })
      data['Promedio'] = calculateFinal(s.id)
      data['Estado'] = calculateFinal(s.id) >= 13 ? 'APROBADO' : 'DESAPROBADO'
      return data
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Registro_Auxiliar")
    XLSX.writeFile(wb, "REGISTRO_AUXILIAR_SALLE.xlsx")
    toast({ title: "Excel Exportado" })
  }

  const filtered = students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="h-9 text-primary font-bold px-0 hover:bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" /> VOLVER AL PANEL
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary rounded-2xl text-white shadow-xl shadow-primary/20">
              <ClipboardCheck className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-4xl font-headline font-black tracking-tight text-slate-900">Registro Auxiliar</h2>
              <p className="text-slate-500 font-medium">Control de Calificaciones e Instrumentos</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <Button variant="outline" className="h-12 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold flex-1 md:flex-initial" onClick={handleExport}>
            <FileSpreadsheet className="h-4 w-4" /> EXPORTAR SÁBANA
          </Button>
          <Button className="h-12 gap-2 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 flex-1 md:flex-initial">
            <Save className="h-4 w-4" /> GUARDAR REGISTRO
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border-none shadow-xl overflow-hidden bg-white rounded-3xl">
          <div className="p-6 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por apellidos..." 
                className="pl-12 h-11 border-none shadow-inner rounded-xl bg-white"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="font-bold text-xs uppercase tracking-widest text-slate-500"><Settings2 className="h-4 w-4 mr-2" /> Columnas</Button>
            </div>
          </div>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader className="bg-slate-50/30">
                  <TableRow className="border-none">
                    <TableHead className="pl-8 font-black text-[10px] uppercase text-slate-400 tracking-widest w-[350px]">Estudiante</TableHead>
                    {columns.map(c => (
                      <TableHead key={c.id} className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest px-2">
                        {c.name} <span className="block text-[8px] text-primary/50">{c.weight}%</span>
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-black text-[10px] uppercase text-primary tracking-widest bg-primary/5 w-[100px]">Prom.</TableHead>
                    <TableHead className="pr-8 text-right font-black text-[10px] uppercase text-slate-400 tracking-widest">Evaluar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50 border-slate-50 transition-colors group">
                      <TableCell className="pl-8 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                            <AvatarFallback className="bg-primary/5 text-primary font-bold text-xs">{getInitials(s.nombre)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-800 uppercase tracking-tight">{s.nombre}</span>
                            <span className="text-[10px] text-slate-400 font-mono">DNI: {s.dni}</span>
                          </div>
                        </div>
                      </TableCell>
                      {columns.map(c => (
                        <TableCell key={c.id} className="text-center px-2">
                          <Input 
                            type="number" 
                            className={`w-14 h-9 mx-auto text-center font-bold text-sm border-none shadow-sm ${
                              (grades[s.id]?.[c.id] || 0) < 13 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                            }`}
                            value={grades[s.id]?.[c.id] || 0}
                            onChange={e => handleGradeChange(s.id, c.id, e.target.value)}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center bg-primary/5">
                        <span className={`text-sm font-black ${calculateFinal(s.id) < 13 ? 'text-red-600' : 'text-primary'}`}>
                          {calculateFinal(s.id).toString().padStart(2, '0')}
                        </span>
                      </TableCell>
                      <TableCell className="pr-8 text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
                              onClick={() => { setActiveStudent(s); setActiveColumn(columns[0].id); }}
                            >
                              <Target className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                            <div className="bg-primary p-8 text-white">
                              <h3 className="text-2xl font-black uppercase tracking-tight mb-1">Evaluación por Instrumento</h3>
                              <p className="text-blue-100/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <GraduationCap className="h-4 w-4" /> {s.nombre}
                              </p>
                            </div>
                            <div className="p-8 space-y-6">
                              <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl">
                                <Button 
                                  variant={!isRubricaOpen ? 'default' : 'ghost'} 
                                  className="flex-1 rounded-xl font-bold h-11" 
                                  onClick={() => setIsRubricaOpen(false)}
                                >
                                  <LayoutList className="mr-2 h-4 w-4" /> Lista de Cotejo
                                </Button>
                                <Button 
                                  variant={isRubricaOpen ? 'default' : 'ghost'} 
                                  className="flex-1 rounded-xl font-bold h-11" 
                                  onClick={() => setIsRubricaOpen(true)}
                                >
                                  <Target className="mr-2 h-4 w-4" /> Rúbrica
                                </Button>
                              </div>

                              {!isRubricaOpen ? (
                                <div className="space-y-4">
                                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-2">CRITERIOS DE DESEMPEÑO</p>
                                  {[
                                    "Identifica correctamente los componentes de la arquitectura.",
                                    "Aplica patrones de diseño adecuados al problema.",
                                    "Sustenta con base técnica sus decisiones.",
                                    "Mantiene orden y coherencia en la documentación."
                                  ].map((crit, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-primary/5 transition-colors cursor-pointer group border border-transparent hover:border-primary/10">
                                      <span className="text-sm font-bold text-slate-700 group-hover:text-primary">{crit}</span>
                                      <div className="h-6 w-6 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center group-hover:border-primary transition-all">
                                        <div className="h-3 w-3 rounded-full bg-primary opacity-0 group-active:opacity-100" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-6">
                                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                                    <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
                                    <p className="text-xs text-amber-800 leading-relaxed font-medium">La rúbrica asignará un puntaje proporcional al nivel alcanzado en cada dimensión evaluada.</p>
                                  </div>
                                  <div className="space-y-4">
                                    {["Contenido", "Presentación", "Dominio Temático"].map((dim, i) => (
                                      <div key={i} className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dim}</Label>
                                        <div className="grid grid-cols-4 gap-2">
                                          {["INICIO", "PROC", "LOGRO", "DEST"].map(lvl => (
                                            <Button key={lvl} variant="outline" className="h-9 text-[9px] font-black border-slate-200 hover:border-primary hover:text-primary">{lvl}</Button>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="p-8 bg-slate-50 border-t flex justify-end gap-3">
                              <Button variant="ghost" className="font-bold text-slate-500 uppercase text-xs tracking-widest">Cancelar</Button>
                              <Button className="bg-primary font-black uppercase text-xs tracking-widest px-8 h-12 shadow-lg shadow-primary/20">Aplicar Nota</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-primary text-white rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                <Target className="h-5 w-5" /> Estadísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-5 bg-white/10 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">Promedio Grupal</p>
                <p className="text-4xl font-black tracking-tighter">14.8</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-emerald-500/20 rounded-2xl border border-emerald-500/20">
                  <p className="text-[8px] font-black uppercase tracking-widest text-emerald-200 mb-1">Aprobados</p>
                  <p className="text-xl font-black">85%</p>
                </div>
                <div className="p-4 bg-red-500/20 rounded-2xl border border-red-500/20">
                  <p className="text-[8px] font-black uppercase tracking-widest text-red-200 mb-1">Riesgo</p>
                  <p className="text-xl font-black">15%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white rounded-[2rem] p-6 space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-3">Resumen de Evaluación</h4>
            <div className="space-y-4">
              {["Evaluaciones Tomadas: 02", "Pendientes: 01", "Última Modif: Hoy"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {item}
                </div>
              ))}
            </div>
            <div className="pt-4 border-t">
              <Button variant="link" className="p-0 h-auto text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                Ver Historial Completo <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ icon: Icon, active, color, onClick }: any) {
  const styles: any = {
    green: active ? "bg-emerald-600 text-white scale-110 shadow-lg shadow-emerald-200" : "text-slate-300 hover:text-emerald-600 hover:bg-emerald-50",
    primary: active ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" : "text-slate-300 hover:text-primary hover:bg-primary/5",
  }
  return (
    <Button 
      size="icon" 
      variant="outline" 
      onClick={onClick} 
      className={`h-10 w-10 rounded-xl border-slate-100 transition-all duration-300 ${styles[color]}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
