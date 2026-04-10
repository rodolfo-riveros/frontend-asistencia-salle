
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
  Trash2,
  PlusCircle,
  Library
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
  description: string
}

interface RubricCriterion {
  id: string
  category: string
  levels: RubricLevel[]
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
  instrumentId: string
}

// --- Plantillas Institucionales ---
const TEMPLATES: Record<string, Instrument> = {
  'cotejo-cloud': {
    id: 'cotejo-cloud',
    name: 'Lista de Cotejo - Cloud Computing',
    type: 'cotejo',
    criteria: [
      { id: '1', description: 'Define correctamente qué es el cloud computing.', points: 2 },
      { id: '2', description: 'Distingue los 3 modelos de servicio (IaaS, PaaS, SaaS).', points: 2 },
      { id: '3', description: 'Identifica los 3 modelos de despliegue.', points: 2 },
      { id: '4', description: 'Menciona al menos 3 ventajas del cloud.', points: 2 },
      { id: '5', description: 'Reconoce proveedores: AWS, Azure y Google Cloud.', points: 2 },
      { id: '6', description: 'Argumenta la elección de un proveedor.', points: 2 },
      { id: '7', description: 'Identifica en consola AWS los servicios EC2, S3 e IAM.', points: 2 },
      { id: '8', description: 'Compara un servicio de AWS con Azure.', points: 2 },
      { id: '9', description: 'Participa activamente en el trabajo grupal.', points: 2 },
      { id: '10', description: 'Utiliza terminología técnica cloud.', points: 2 },
    ]
  },
  'rubrica-cloud': {
    id: 'rubrica-cloud',
    name: 'Rúbrica - Análisis Cloud',
    type: 'rubrica',
    criteria: [
      { 
        id: 'r1', 
        category: 'Modelos Cloud', 
        levels: [
          { label: 'Excelente', points: 4, description: 'Clasifica IaaS, PaaS, SaaS y despliegue con justificación sólida.' },
          { label: 'Bueno', points: 3, description: 'Clasifica la mayoría con ejemplos apropiados.' },
          { label: 'Regular', points: 2, description: 'Confunde conceptos en al menos uno.' },
          { label: 'Deficiente', points: 1, description: 'Clasificación incorrecta.' },
          { label: 'No presenta', points: 0, description: 'Sin trabajo.' },
        ]
      },
      { 
        id: 'r2', 
        category: 'Análisis Técnico', 
        levels: [
          { label: 'Excelente', points: 4, description: 'Argumentación detallada incluyendo riesgos.' },
          { label: 'Bueno', points: 3, description: 'Argumentación comprensible pero poco detallada.' },
          { label: 'Regular', points: 2, description: 'Argumentación básica o parcial.' },
          { label: 'Deficiente', points: 1, description: 'Selección inadecuada.' },
          { label: 'No presenta', points: 0, description: 'Sin trabajo.' },
        ]
      }
    ]
  }
}

export default function AcademicGradebookPage() {
  const params = useParams()
  const router = useRouter()
  
  const [students, setStudents] = React.useState<any[]>([])
  const [columns, setColumns] = React.useState<Column[]>([])
  const [instruments, setInstruments] = React.useState<Record<string, Instrument>>({})
  const [grades, setGrades] = React.useState<Record<string, Record<string, number>>>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  
  // Modals
  const [isNewColOpen, setIsNewColOpen] = React.useState(false)
  const [activeEval, setActiveEval] = React.useState<{ student: any, column: Column } | null>(null)
  const [evalData, setEvalData] = React.useState<Record<string, any>>({})

  // Editor State
  const [newColType, setNewColType] = React.useState<ColumnType>('manual')
  const [newColName, setNewColName] = React.useState("")
  const [editorCriteria, setEditorCriteria] = React.useState<any[]>([])

  const fetchStudents = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>(`/me/unidades/${params.id}/alumnos`)
      setStudents(data)
      const initialGrades: any = {}
      data.forEach(s => { initialGrades[s.id] = {} })
      setGrades(initialGrades)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los alumnos." })
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  React.useEffect(() => { fetchStudents() }, [fetchStudents])

  const addColumn = () => {
    const id = `col-${Date.now()}`
    const instId = `inst-${Date.now()}`
    
    const newInstrument: Instrument = {
      id: instId,
      name: newColName,
      type: newColType,
      criteria: editorCriteria
    }

    const newColumn: Column = {
      id,
      name: newColName,
      weight: 100 / (columns.length + 1),
      type: newColType,
      instrumentId: instId
    }

    setInstruments(prev => ({ ...prev, [instId]: newInstrument }))
    setColumns(prev => [...prev, newColumn])
    
    // Initialize grades for new column
    setGrades(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(sid => { next[sid][id] = 0 })
      return next
    })

    setIsNewColOpen(false)
    resetEditor()
    toast({ title: "Columna Añadida", description: `${newColName} lista para calificar.` })
  }

  const resetEditor = () => {
    setNewColName("")
    setNewColType('manual')
    setEditorCriteria([])
  }

  const loadTemplate = (templateKey: string) => {
    const template = TEMPLATES[templateKey]
    setNewColName(template.name)
    setNewColType(template.type)
    setEditorCriteria(template.criteria)
  }

  const handleGradeChange = (studentId: string, columnId: string, value: string) => {
    const numValue = Math.min(20, Math.max(0, parseInt(value) || 0))
    setGrades(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [columnId]: numValue }
    }))
  }

  const applyInstrumentScore = () => {
    if (!activeEval) return
    const inst = instruments[activeEval.column.instrumentId]
    let score = 0

    if (inst.type === 'cotejo') {
      const ptsPerItem = 20 / inst.criteria.length
      Object.entries(evalData).forEach(([cid, val]) => {
        if (val === true) score += ptsPerItem
      })
    } else if (inst.type === 'rubrica') {
      Object.values(evalData).forEach(pts => score += (pts as number))
    }

    handleGradeChange(activeEval.student.id, activeEval.column.id, Math.round(score).toString())
    setActiveEval(null)
    setEvalData({})
  }

  const calculateFinal = (studentId: string) => {
    const studentGrades = grades[studentId] || {}
    if (columns.length === 0) return 0
    let total = 0
    columns.forEach(c => { total += (studentGrades[c.id] || 0) * (c.weight / 100) })
    return Math.round(total)
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
              <p className="text-slate-500 font-medium italic">Gestión de Instrumentos y Calificaciones</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <Dialog open={isNewColOpen} onOpenChange={setIsNewColOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 gap-2 bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20 flex-1 md:flex-initial">
                <PlusCircle className="h-4 w-4" /> CONFIGURAR EVALUACIÓN
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
              <div className="bg-primary p-8 text-white">
                <h3 className="text-2xl font-black uppercase tracking-tight">Nueva Columna de Evaluación</h3>
                <p className="text-blue-100/80 font-bold uppercase text-[10px] tracking-widest">Define el instrumento para esta calificación</p>
              </div>
              <div className="p-8 space-y-6 bg-white">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase text-slate-400">Nombre de la Actividad</Label>
                    <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Ej. Práctica Calificada 1" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase text-slate-400">Tipo de Calificación</Label>
                    <Select value={newColType} onValueChange={(v: any) => setNewColType(v)}>
                      <SelectTrigger className="h-12 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Entrada Manual (0-20)</SelectItem>
                        <SelectItem value="cotejo">Lista de Cotejo</SelectItem>
                        <SelectItem value="rubrica">Rúbrica Holística</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newColType !== 'manual' && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <Label className="font-black text-[10px] uppercase text-primary tracking-widest">Definición de Criterios</Label>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-black" onClick={() => loadTemplate(newColType === 'cotejo' ? 'cotejo-cloud' : 'rubrica-cloud')}>
                          <Library className="h-3 w-3 mr-1" /> CARGAR PLANTILLA
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black" onClick={() => setEditorCriteria([...editorCriteria, { id: Date.now().toString(), description: "", points: 0 }])}>
                          <Plus className="h-3 w-3 mr-1" /> AÑADIR ÍTEM
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-[250px] pr-4">
                      <div className="space-y-3">
                        {editorCriteria.map((cr, idx) => (
                          <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border">
                            <span className="font-black text-xs text-slate-400">{idx + 1}.</span>
                            <Input 
                              value={cr.description || cr.category} 
                              onChange={e => {
                                const next = [...editorCriteria]
                                if (newColType === 'cotejo') next[idx].description = e.target.value
                                else next[idx].category = e.target.value
                                setEditorCriteria(next)
                              }}
                              placeholder={newColType === 'cotejo' ? "Descripción del criterio..." : "Categoría de la rúbrica..."} 
                              className="border-none bg-transparent shadow-none"
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => setEditorCriteria(editorCriteria.filter((_, i) => i !== idx))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {editorCriteria.length === 0 && <p className="text-center py-10 text-slate-400 text-xs italic">No hay criterios definidos. Agrega uno o carga una plantilla.</p>}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
              <div className="p-8 bg-slate-50 border-t flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsNewColOpen(false)} className="font-black text-[10px] uppercase">Cancelar</Button>
                <Button className="bg-primary px-10 font-black text-[10px] uppercase shadow-lg shadow-primary/20" onClick={addColumn} disabled={!newColName}>Crear Columna</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-xl overflow-hidden bg-white rounded-3xl">
          <div className="p-6 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar alumno por nombre..." 
                className="pl-12 h-11 border-none shadow-inner rounded-xl bg-white"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
               <Badge variant="outline" className="bg-white px-4 py-2 border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-widest">
                 {columns.length} Evaluaciones Configuradas
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
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-black text-[10px] uppercase text-primary tracking-widest bg-primary/5 w-[100px] border-l">Prom.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? (
                    filtered.map((s) => (
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
                                      onClick={() => { setActiveEval({ student: s, column: c }); setEvalData({}); }}
                                    >
                                      <Target className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-[2rem]">
                                    {activeEval && (
                                      <div className="flex flex-col h-[85vh]">
                                        <div className="bg-primary p-8 text-white flex justify-between items-center shrink-0">
                                          <div className="space-y-1">
                                            <h3 className="text-2xl font-black uppercase tracking-tight">Evaluación con Instrumento</h3>
                                            <p className="flex items-center gap-2 text-blue-100/80 font-bold uppercase text-[10px] tracking-widest">
                                              <Target className="h-4 w-4" /> {activeEval.column.name} — {activeEval.student.nombre}
                                            </p>
                                          </div>
                                          <Badge className="bg-white/20 text-white border-none py-2 px-4 font-mono text-lg">
                                            Nota Estimada: {
                                              activeEval.column.type === 'cotejo' 
                                              ? Math.round(Object.values(evalData).filter(v => v === true).length * (20 / instruments[activeEval.column.instrumentId].criteria.length))
                                              : Object.values(evalData).reduce((acc, v) => acc + (v as number), 0)
                                            }
                                          </Badge>
                                        </div>

                                        <ScrollArea className="flex-grow p-8 bg-slate-50">
                                          {activeEval.column.type === 'cotejo' ? (
                                            <div className="space-y-4">
                                              <div className="grid grid-cols-[1fr_80px_80px] gap-4 px-4 py-2 font-black text-[10px] uppercase text-slate-400 tracking-widest border-b">
                                                <span>Criterios de Evaluación</span>
                                                <span className="text-center">SÍ</span>
                                                <span className="text-center">NO</span>
                                              </div>
                                              {instruments[activeEval.column.instrumentId].criteria.map((cr: any, i: number) => (
                                                <div key={i} className="grid grid-cols-[1fr_80px_80px] gap-4 items-center p-4 bg-white rounded-2xl shadow-sm border border-slate-100 group hover:border-primary/20 transition-all">
                                                  <span className="text-sm font-bold text-slate-700">{i + 1}. {cr.description}</span>
                                                  <div className="flex justify-center">
                                                    <Button 
                                                      variant="ghost" 
                                                      className={`h-10 w-10 rounded-xl ${evalData[i] === true ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-200 hover:bg-emerald-50 hover:text-emerald-500'}`}
                                                      onClick={() => setEvalData(p => ({ ...p, [i]: true }))}
                                                    >
                                                      <CheckCircle2 className="h-6 w-6" />
                                                    </Button>
                                                  </div>
                                                  <div className="flex justify-center">
                                                    <Button 
                                                      variant="ghost" 
                                                      className={`h-10 w-10 rounded-xl ${evalData[i] === false ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'text-slate-200 hover:bg-red-50 hover:text-red-500'}`}
                                                      onClick={() => setEvalData(p => ({ ...p, [i]: false }))}
                                                    >
                                                      <XCircle className="h-6 w-6" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="space-y-8">
                                              {instruments[activeEval.column.instrumentId].criteria.map((rc: any, i: number) => (
                                                <div key={i} className="space-y-4">
                                                  <Label className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] block pl-2">{rc.category}</Label>
                                                  <div className="grid grid-cols-5 gap-3">
                                                    {(rc.levels || []).map((lvl: any) => (
                                                      <Button 
                                                        key={lvl.label}
                                                        variant="outline"
                                                        className={`h-auto flex-col gap-2 p-4 rounded-2xl border-2 transition-all text-left items-start ${
                                                          evalData[i] === lvl.points 
                                                          ? 'border-primary bg-primary/5 ring-4 ring-primary/5' 
                                                          : 'border-white bg-white hover:border-slate-200'
                                                        }`}
                                                        onClick={() => setEvalData(p => ({ ...p, [i]: lvl.points }))}
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
                                          <Button variant="ghost" className="font-bold text-slate-400 uppercase text-xs tracking-widest" onClick={() => setActiveEval(null)}>Descartar</Button>
                                          <Button 
                                            className="bg-primary font-black uppercase text-xs tracking-widest px-10 h-12 shadow-xl shadow-primary/20"
                                            onClick={applyInstrumentScore}
                                          >
                                            VACIAR NOTA AL REGISTRO
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
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length + 2} className="h-48 text-center text-slate-400 italic">
                        {isLoading ? "Cargando estudiantes..." : "No se encontraron estudiantes."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        {columns.length === 0 && !isLoading && (
          <Card className="p-20 border-2 border-dashed border-slate-200 bg-white rounded-[2rem] flex flex-col items-center gap-4 text-slate-400">
            <Settings2 className="h-12 w-12 opacity-20" />
            <div className="text-center">
              <p className="font-bold text-slate-900">El registro auxiliar está vacío</p>
              <p className="text-sm">Configura tu primera columna de evaluación para empezar.</p>
            </div>
            <Button variant="outline" className="font-bold gap-2 mt-2" onClick={() => setIsNewColOpen(true)}>
              <PlusCircle className="h-4 w-4" /> Configurar Ahora
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
