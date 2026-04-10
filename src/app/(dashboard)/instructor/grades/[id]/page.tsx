
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Search, 
  Save, 
  Plus, 
  FileSpreadsheet, 
  Settings2,
  Target,
  ChevronRight,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  LayoutList,
  FileText,
  Trash2
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { getInitials } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import * as XLSX from 'xlsx'

// --- Tipos ---
type ColumnType = 'manual' | 'cotejo' | 'rubrica'

interface Criterion {
  id: string
  description: string
  points: number
}

interface RubricLevel {
  label: string
  points: number
}

interface RubricCriterion {
  id: string
  category: string
  levels: { label: string; description: string; points: number }[]
}

interface Instrument {
  id: string
  name: string
  type: ColumnType
  criteria: any[]
}

interface Column {
  id: string
  name: string
  weight: number
  type: ColumnType
  instrumentId?: string
}

// --- Plantillas Predeterminadas ---
const CLOUD_COTEJO: Instrument = {
  id: 'tmpl-cotejo-cloud',
  name: 'Lista de Cotejo - Cloud Computing',
  type: 'cotejo',
  criteria: [
    { id: '1', description: 'Define correctamente qué es el cloud computing con sus propias palabras.', points: 2 },
    { id: '2', description: 'Distingue los 3 modelos de servicio (IaaS, PaaS, SaaS) con ejemplos reales.', points: 2 },
    { id: '3', description: 'Identifica los 3 modelos de despliegue (pública, privada, híbrida).', points: 2 },
    { id: '4', description: 'Menciona al menos 3 ventajas del cloud aplicadas a empresas.', points: 2 },
    { id: '5', description: 'Reconoce proveedores: AWS, Azure y Google Cloud.', points: 2 },
    { id: '6', description: 'Argumenta la elección de un proveedor para el caso asignado.', points: 2 },
    { id: '7', description: 'Identifica en consola AWS los servicios EC2, S3 e IAM.', points: 2 },
    { id: '8', description: 'Compara visualmente un servicio de AWS con su equivalente en Azure.', points: 2 },
    { id: '9', description: 'Participa activamente en el trabajo grupal.', points: 2 },
    { id: '10', description: 'Utiliza terminología técnica cloud con propiedad.', points: 2 },
  ]
}

const CLOUD_RUBRICA: Instrument = {
  id: 'tmpl-rubrica-cloud',
  name: 'Rúbrica - Análisis de Caso Cloud',
  type: 'rubrica',
  criteria: [
    { 
      id: 'r1', 
      category: 'Modelos Cloud', 
      levels: [
        { label: 'Excelente', points: 4, description: 'Clasifica IaaS, PaaS, SaaS y despliegue con justificación sólida.' },
        { label: 'Bueno', points: 3, description: 'Clasifica la mayoría con ejemplos apropiados.' },
        { label: 'Regular', points: 2, description: 'Confunde conceptos en al menos uno.' },
        { label: 'Deficiente', points: 1, description: 'Clasificación incorrecta o sin justificación.' },
        { label: 'No presenta', points: 0, description: 'No realizó la actividad.' },
      ]
    },
    { 
      id: 'r2', 
      category: 'Análisis Técnico', 
      levels: [
        { label: 'Excelente', points: 4, description: 'Argumentación detallada incluyendo riesgos.' },
        { label: 'Bueno', points: 3, description: 'Argumentación comprensible pero poco detallada.' },
        { label: 'Regular', points: 2, description: 'Argumentación básica o parcialmente incorrecta.' },
        { label: 'Deficiente', points: 1, description: 'Selección inadecuada sin justificación.' },
        { label: 'No presenta', points: 0, description: 'Sin trabajo.' },
      ]
    },
    { 
      id: 'r3', 
      category: 'Exploración AWS', 
      levels: [
        { label: 'Excelente', points: 4, description: 'Identifica EC2, S3 e IAM y compara con Azure.' },
        { label: 'Bueno', points: 3, description: 'Identifica los 3 en AWS con imprecisiones en Azure.' },
        { label: 'Regular', points: 2, description: 'Identifica al menos 2 servicios en AWS.' },
        { label: 'Deficiente', points: 1, description: 'No identifica servicios o no realiza práctica.' },
        { label: 'No presenta', points: 0, description: 'Sin trabajo.' },
      ]
    },
    { 
      id: 'r4', 
      category: 'Colaboración', 
      levels: [
        { label: 'Excelente', points: 4, description: 'Participa activamente y distribuye tareas equitativamente.' },
        { label: 'Bueno', points: 3, description: 'Participa de forma constante.' },
        { label: 'Regular', points: 2, description: 'Participación limitada; depende del grupo.' },
        { label: 'Deficiente', points: 1, description: 'No participa o genera conflictos.' },
        { label: 'No presenta', points: 0, description: 'Sin participación.' },
      ]
    },
    { 
      id: 'r5', 
      category: 'Comunicación', 
      levels: [
        { label: 'Excelente', points: 4, description: 'Presentación clara, organizada y responde pertinentemente.' },
        { label: 'Bueno', points: 3, description: 'Presentación comprensible con buena estructura.' },
        { label: 'Regular', points: 2, description: 'Problemas de organización o tiempo.' },
        { label: 'Deficiente', points: 1, description: 'Confusa o incompleta.' },
        { label: 'No presenta', points: 0, description: 'No asiste.' },
      ]
    }
  ]
}

export default function AcademicGradebookPage() {
  const params = useParams()
  const router = useRouter()
  
  const [students, setStudents] = React.useState<any[]>([])
  const [columns, setColumns] = React.useState<Column[]>([
    { id: 'c1', name: 'Lista Cotejo Cloud', weight: 50, type: 'cotejo', instrumentId: 'tmpl-cotejo-cloud' },
    { id: 'c2', name: 'Rúbrica Cloud', weight: 50, type: 'rubrica', instrumentId: 'tmpl-rubrica-cloud' }
  ])
  const [grades, setGrades] = React.useState<Record<string, Record<string, number>>>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  
  // Instrument Modal State
  const [activeEval, setActiveEval] = React.useState<{ student: any, column: Column } | null>(null)
  const [evalData, setEvalData] = React.useState<Record<string, any>>({}) // checklist selections or rubric level

  const fetchStudents = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>(`/me/unidades/${params.id}/alumnos`)
      setStudents(data)
      
      const initialGrades: any = {}
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
  }, [params.id])

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

  const openEvaluation = (student: any, column: Column) => {
    setActiveEval({ student, column })
    setEvalData({}) // Reset
  }

  const applyInstrumentScore = () => {
    if (!activeEval) return
    
    let score = 0
    if (activeEval.column.type === 'cotejo') {
      const criteria = CLOUD_COTEJO.criteria
      Object.entries(evalData).forEach(([cid, val]) => {
        if (val === true) score += criteria.find(c => c.id === cid)?.points || 0
      })
    } else if (activeEval.column.type === 'rubrica') {
      Object.values(evalData).forEach(pts => score += (pts as number))
    }

    handleGradeChange(activeEval.student.id, activeEval.column.id, score.toString())
    setActiveEval(null)
    toast({ title: "Calificación Aplicada", description: `Se asignó un puntaje de ${score} a ${activeEval.student.nombre}` })
  }

  const handleExport = () => {
    const rows = students.map((s, idx) => {
      const data: any = { 'N°': idx + 1, 'Estudiante': s.nombre, 'DNI': s.dni }
      columns.forEach(c => { data[c.name] = grades[s.id][c.id] })
      data['Promedio'] = calculateFinal(s.id)
      return data
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Notas")
    XLSX.writeFile(wb, "REGISTRO_AUXILIAR_SALLE.xlsx")
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
              <h2 className="text-4xl font-headline font-black tracking-tight text-slate-900">Registro de Evaluación</h2>
              <p className="text-slate-500 font-medium italic">Evaluación Cloud Computing & Instrumentos</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <Button variant="outline" className="h-12 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold flex-1 md:flex-initial" onClick={handleExport}>
            <FileSpreadsheet className="h-4 w-4" /> EXPORTAR EXCEL
          </Button>
          <Button className="h-12 gap-2 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 flex-1 md:flex-initial">
            <Save className="h-4 w-4" /> GUARDAR TODO
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-xl overflow-hidden bg-white rounded-3xl">
          <div className="p-6 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar alumno..." 
                className="pl-12 h-11 border-none shadow-inner rounded-xl bg-white"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
               <Badge variant="outline" className="bg-white px-4 py-2 border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-widest">
                 {columns.length} Columnas de Evaluación
               </Badge>
            </div>
          </div>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader className="bg-slate-50/30">
                  <TableRow className="border-none">
                    <TableHead className="pl-8 font-black text-[10px] uppercase text-slate-400 tracking-widest w-[300px]">Estudiante</TableHead>
                    {columns.map(c => (
                      <TableHead key={c.id} className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest px-4 border-l">
                        <div className="flex flex-col items-center gap-1">
                          {c.type === 'cotejo' && <LayoutList className="h-3 w-3 text-blue-500" />}
                          {c.type === 'rubrica' && <Target className="h-3 w-3 text-purple-500" />}
                          {c.type === 'manual' && <FileText className="h-3 w-3 text-slate-400" />}
                          {c.name}
                          <span className="text-[8px] opacity-50">{c.weight}%</span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-black text-[10px] uppercase text-primary tracking-widest bg-primary/5 w-[100px] border-l">Prom.</TableHead>
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
                        <TableCell key={c.id} className="text-center px-4 border-l">
                          <div className="flex items-center justify-center gap-2">
                            <Input 
                              type="number" 
                              className={`w-14 h-9 text-center font-black text-sm border-none shadow-sm ${
                                (grades[s.id]?.[c.id] || 0) < 13 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                              }`}
                              value={grades[s.id]?.[c.id] || 0}
                              onChange={e => handleGradeChange(s.id, c.id, e.target.value)}
                            />
                            {c.type !== 'manual' && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary transition-all"
                                    onClick={() => openEvaluation(s, c)}
                                  >
                                    <Target className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-[2rem]">
                                  {activeEval && (
                                    <div className="flex flex-col h-[85vh]">
                                      <div className="bg-primary p-8 text-white flex justify-between items-center shrink-0">
                                        <div className="space-y-1">
                                          <h3 className="text-2xl font-black uppercase tracking-tight">Instrumento de Evaluación</h3>
                                          <p className="flex items-center gap-2 text-blue-100/80 font-bold uppercase text-[10px] tracking-widest">
                                            <Target className="h-4 w-4" /> {activeEval.column.name} — {activeEval.student.nombre}
                                          </p>
                                        </div>
                                        <Badge className="bg-white/20 text-white border-none py-2 px-4 font-mono text-lg">
                                          Nota: {
                                            activeEval.column.type === 'cotejo' 
                                            ? CLOUD_COTEJO.criteria.reduce((acc, cr) => acc + (evalData[cr.id] ? cr.points : 0), 0)
                                            : Object.values(evalData).reduce((acc, v) => acc + (v as number), 0)
                                          }
                                        </Badge>
                                      </div>

                                      <ScrollArea className="flex-grow p-8 bg-slate-50">
                                        {activeEval.column.type === 'cotejo' ? (
                                          <div className="space-y-4">
                                            <div className="grid grid-cols-[1fr_80px_80px] gap-4 px-4 py-2 font-black text-[10px] uppercase text-slate-400 tracking-widest border-b">
                                              <span>Criterios de Evaluación</span>
                                              <span className="text-center">SÍ (2)</span>
                                              <span className="text-center">NO (0)</span>
                                            </div>
                                            {CLOUD_COTEJO.criteria.map((cr) => (
                                              <div key={cr.id} className="grid grid-cols-[1fr_80px_80px] gap-4 items-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group hover:border-primary/20 transition-all">
                                                <span className="text-sm font-bold text-slate-700">{cr.id}. {cr.description}</span>
                                                <div className="flex justify-center">
                                                  <Button 
                                                    variant="ghost" 
                                                    className={`h-10 w-10 rounded-xl ${evalData[cr.id] === true ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-200 hover:bg-emerald-50 hover:text-emerald-500'}`}
                                                    onClick={() => setEvalData(p => ({ ...p, [cr.id]: true }))}
                                                  >
                                                    <CheckCircle2 className="h-6 w-6" />
                                                  </Button>
                                                </div>
                                                <div className="flex justify-center">
                                                  <Button 
                                                    variant="ghost" 
                                                    className={`h-10 w-10 rounded-xl ${evalData[cr.id] === false ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'text-slate-200 hover:bg-red-50 hover:text-red-500'}`}
                                                    onClick={() => setEvalData(p => ({ ...p, [cr.id]: false }))}
                                                  >
                                                    <XCircle className="h-6 w-6" />
                                                  </Button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="space-y-8">
                                            {CLOUD_RUBRICA.criteria.map((rc) => (
                                              <div key={rc.id} className="space-y-4">
                                                <Label className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] block pl-2">{rc.category}</Label>
                                                <div className="grid grid-cols-5 gap-3">
                                                  {rc.levels.map((lvl) => (
                                                    <Button 
                                                      key={lvl.label}
                                                      variant="outline"
                                                      className={`h-auto flex-col gap-2 p-4 rounded-2xl border-2 transition-all text-left items-start ${
                                                        evalData[rc.id] === lvl.points 
                                                        ? 'border-primary bg-primary/5 ring-4 ring-primary/5' 
                                                        : 'border-white bg-white hover:border-slate-200'
                                                      }`}
                                                      onClick={() => setEvalData(p => ({ ...p, [rc.id]: lvl.points }))}
                                                    >
                                                      <div className="flex justify-between w-full">
                                                        <span className="font-black text-[10px] uppercase tracking-widest text-primary">{lvl.label}</span>
                                                        <span className="font-black text-sm text-slate-900">{lvl.points} pts</span>
                                                      </div>
                                                      <p className="text-[11px] leading-relaxed text-slate-500 font-medium">{lvl.description}</p>
                                                    </Button>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </ScrollArea>

                                      <div className="p-8 bg-white border-t flex justify-end gap-4 shrink-0">
                                        <Button variant="ghost" className="font-bold text-slate-400 uppercase text-xs tracking-widest">Descartar</Button>
                                        <Button 
                                          className="bg-primary font-black uppercase text-xs tracking-widest px-10 h-12 shadow-xl shadow-primary/20"
                                          onClick={applyInstrumentScore}
                                        >
                                          Aplicar Calificación
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-center bg-primary/5 border-l">
                        <span className={`text-sm font-black ${calculateFinal(s.id) < 13 ? 'text-red-600' : 'text-primary'}`}>
                          {calculateFinal(s.id).toString().padStart(2, '0')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-xl bg-slate-900 text-white p-8 rounded-[2rem]">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-xl">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estadísticas del Ciclo</h4>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 mb-1">Promedio General</p>
                <p className="text-5xl font-black tracking-tighter">14.2</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                  <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400 mb-1">Aprobados</p>
                  <p className="text-2xl font-black">18</p>
                </div>
                <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/10">
                  <p className="text-[8px] font-black uppercase tracking-widest text-red-400 mb-1">En Riesgo</p>
                  <p className="text-2xl font-black">03</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="md:col-span-2 border-none shadow-xl bg-white p-8 rounded-[2rem] flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Configuración de Instrumentos
              </h4>
              <p className="text-sm text-slate-500 font-medium">
                Has configurado 2 instrumentos de evaluación para esta unidad didáctica. 
                Cada instrumento genera automáticamente una columna en el registro auxiliar.
              </p>
              <div className="flex gap-3 pt-2">
                <Badge className="bg-blue-50 text-blue-600 border-none px-3 py-1.5 font-bold text-[10px] uppercase tracking-tight">1x Lista de Cotejo</Badge>
                <Badge className="bg-purple-50 text-purple-600 border-none px-3 py-1.5 font-bold text-[10px] uppercase tracking-tight">1x Rúbrica Holística</Badge>
              </div>
            </div>
            <div className="pt-6 border-t flex gap-3">
              <Button variant="outline" className="flex-1 font-bold border-slate-100 hover:bg-slate-50">
                <Plus className="h-4 w-4 mr-2" /> Nueva Columna
              </Button>
              <Button variant="outline" className="flex-1 font-bold border-slate-100 hover:bg-slate-50">
                <LayoutList className="h-4 w-4 mr-2" /> Gestionar Plantillas
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
