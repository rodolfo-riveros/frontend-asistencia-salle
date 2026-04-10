
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Search, 
  Save, 
  Plus, 
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
  Library,
  Layers,
  AlertTriangle
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
  indicatorId: string
  type: ColumnType
  instrumentId: string
}

const INDICATORS = [
  { id: "ILC1", code: "C5.I1", description: "Instala y administra una plataforma web con LMS Moodle con políticas de seguridad." },
  { id: "ILC2", code: "C5.I2", description: "Instala y administra una plataforma web con CMS WordPress considerando la normativa vigente." },
  { id: "ILC3", code: "C5.I3", description: "Instala y administra una plataforma web con CMS PrestaShop y el comercio electrónico." }
]

const RUBRIC_LEVELS_DEFAULT = [
  { label: 'Excelente', points: 4, description: 'Logro destacado del criterio.' },
  { label: 'Bueno', points: 3, description: 'Logro esperado del criterio.' },
  { label: 'Regular', points: 2, description: 'En proceso de lograr el criterio.' },
  { label: 'Deficiente', points: 1, description: 'Dificultad para lograr el criterio.' },
  { label: 'No presenta', points: 0, description: 'Sin evidencia.' },
]

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

  // Multi-step Editor State
  const [setupStep, setSetupStep] = React.useState(0)
  const [selectedIndicator, setSelectedIndicator] = React.useState("")
  const [newColType, setNewColType] = React.useState<ColumnType>('manual')
  const [newColName, setNewColName] = React.useState("")
  const [editorCriteria, setEditorCriteria] = React.useState<any[]>([])

  const totalPointsChecklist = React.useMemo(() => {
    if (newColType !== 'cotejo') return 0
    return editorCriteria.reduce((acc, curr) => acc + (Number(curr.points) || 0), 0)
  }, [editorCriteria, newColType])

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
    if (newColType === 'cotejo' && totalPointsChecklist !== 20) {
      toast({ variant: "destructive", title: "Puntaje Inválido", description: "La suma de criterios debe ser exactamente 20 puntos." })
      return
    }

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
      indicatorId: selectedIndicator,
      type: newColType,
      instrumentId: instId
    }

    setInstruments(prev => ({ ...prev, [instId]: newInstrument }))
    setColumns(prev => [...prev, newColumn])
    
    setGrades(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(sid => { if(!next[sid]) next[sid] = {}; next[sid][id] = 0 })
      return next
    })

    setIsNewColOpen(false)
    resetEditor()
    toast({ title: "Configuración Exitosa", description: `${newColName} vinculada al indicador.` })
  }

  const resetEditor = () => {
    setSetupStep(0)
    setSelectedIndicator("")
    setNewColName("")
    setNewColType('manual')
    setEditorCriteria([])
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
      Object.entries(evalData).forEach(([idx, val]) => {
        if (val === true) score += inst.criteria[parseInt(idx)].points
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
    columns.forEach(c => { total += (studentGrades[c.id] || 0) * (1 / columns.length) })
    return Math.round(total)
  }

  const filtered = students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="h-9 text-primary font-bold px-0 hover:bg-transparent uppercase tracking-widest text-[10px]">
            <ArrowLeft className="mr-2 h-4 w-4" /> VOLVER AL PANEL
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary rounded-3xl text-white shadow-2xl shadow-primary/20">
              <ClipboardCheck className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-4xl font-headline font-black tracking-tight text-slate-900">Registro Auxiliar</h2>
              <p className="text-slate-500 font-medium italic">Gestión de Instrumentos de Evaluación por Sílabo</p>
            </div>
          </div>
        </div>

        <Dialog open={isNewColOpen} onOpenChange={(o) => { setIsNewColOpen(o); if(!o) resetEditor(); }}>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 gap-3 bg-primary hover:bg-primary/90 font-black shadow-xl shadow-primary/30 rounded-2xl uppercase text-[11px] tracking-widest">
              <PlusCircle className="h-5 w-5" /> Configurar Evaluación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
            <div className="bg-primary p-10 text-white flex justify-between items-end">
              <div>
                <Badge className="bg-white/20 text-white mb-4 border-none font-bold">PASO {setupStep + 1} DE 3</Badge>
                <h3 className="text-3xl font-black uppercase tracking-tight">Nueva Actividad Evaluable</h3>
                <p className="text-blue-100/80 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Configura el instrumento pedagógico</p>
              </div>
              <Layers className="h-16 w-16 text-white/10" />
            </div>

            <div className="p-10 space-y-8 bg-white min-h-[400px]">
              {setupStep === 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-3">
                    <Label className="font-black text-[11px] uppercase text-primary tracking-widest pl-1">1. Seleccionar Indicador de Logro (Sílabo)</Label>
                    <div className="grid gap-3">
                      {INDICATORS.map((ind) => (
                        <Button 
                          key={ind.id} 
                          variant="outline" 
                          className={`h-auto p-5 justify-start text-left flex-col items-start gap-1 rounded-2xl border-2 transition-all ${selectedIndicator === ind.id ? 'border-primary bg-primary/5 ring-4 ring-primary/5' : 'hover:border-slate-300'}`}
                          onClick={() => setSelectedIndicator(ind.id)}
                        >
                          <span className="font-black text-sm text-primary">{ind.code}</span>
                          <span className="text-xs text-slate-500 font-medium leading-relaxed">{ind.description}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {setupStep === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-4">
                    <Label className="font-black text-[11px] uppercase text-primary tracking-widest pl-1">2. Tipo de Instrumento</Label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: 'manual', label: 'Nota Manual', icon: FileText, desc: 'Ingreso directo 0-20' },
                        { id: 'cotejo', label: 'Lista de Cotejo', icon: LayoutList, desc: 'Checklist Sí/No' },
                        { id: 'rubrica', label: 'Rúbrica', icon: Target, desc: 'Matriz de niveles' }
                      ].map((t) => (
                        <Button 
                          key={t.id}
                          variant="outline" 
                          className={`h-auto py-8 flex-col gap-3 rounded-2xl border-2 ${newColType === t.id ? 'border-primary bg-primary/5' : ''}`}
                          onClick={() => setNewColType(t.id as ColumnType)}
                        >
                          <t.icon className={`h-8 w-8 ${newColType === t.id ? 'text-primary' : 'text-slate-300'}`} />
                          <div className="text-center">
                            <p className="font-black text-xs uppercase">{t.label}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{t.desc}</p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="font-black text-[11px] uppercase text-primary tracking-widest pl-1">Nombre de la Sesión / Actividad</Label>
                    <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Ej. Instalación de Moodle en Local" className="h-14 rounded-xl text-lg font-bold" />
                  </div>
                </div>
              )}

              {setupStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border">
                    <div>
                      <p className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Resumen de Configuración</p>
                      <p className="font-bold text-slate-700">{newColName} ({INDICATORS.find(i => i.id === selectedIndicator)?.code})</p>
                    </div>
                    {newColType === 'cotejo' && (
                      <div className={`px-4 py-2 rounded-xl font-black text-sm ${totalPointsChecklist === 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        Total: {totalPointsChecklist}/20 pts
                      </div>
                    )}
                  </div>

                  <ScrollArea className="h-[350px] pr-4">
                    {newColType === 'cotejo' && (
                      <div className="space-y-3">
                        {editorCriteria.map((cr, idx) => (
                          <div key={idx} className="flex gap-3 items-center bg-white p-4 rounded-2xl border-2 border-slate-100 group">
                            <span className="font-black text-xs text-slate-300 w-6">{idx + 1}.</span>
                            <Input 
                              value={cr.description} 
                              onChange={e => {
                                const next = [...editorCriteria]
                                next[idx].description = e.target.value
                                setEditorCriteria(next)
                              }}
                              placeholder="Descripción del criterio..." 
                              className="border-none bg-transparent shadow-none font-medium flex-1"
                            />
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border">
                              <span className="text-[9px] font-black text-slate-400">PTS:</span>
                              <input 
                                type="number" 
                                value={cr.points} 
                                onChange={e => {
                                  const next = [...editorCriteria]
                                  next[idx].points = parseInt(e.target.value) || 0
                                  setEditorCriteria(next)
                                }}
                                className="w-10 bg-transparent text-center font-black text-primary outline-none"
                              />
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-300 hover:text-red-500" onClick={() => setEditorCriteria(editorCriteria.filter((_, i) => i !== idx))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="ghost" className="w-full border-2 border-dashed h-12 rounded-2xl text-slate-400 hover:border-primary hover:text-primary font-bold" onClick={() => setEditorCriteria([...editorCriteria, { id: Date.now().toString(), description: "", points: 2 }])}>
                          + Añadir Criterio de Evaluación
                        </Button>
                      </div>
                    )}

                    {newColType === 'rubrica' && (
                      <div className="space-y-8">
                        {editorCriteria.map((rc, idx) => (
                          <div key={idx} className="space-y-4 p-6 bg-slate-50 rounded-3xl border relative group">
                            <div className="flex justify-between items-center">
                              <Input 
                                value={rc.category} 
                                onChange={e => {
                                  const next = [...editorCriteria]
                                  next[idx].category = e.target.value
                                  setEditorCriteria(next)
                                }}
                                className="font-black uppercase text-xs tracking-widest text-primary bg-transparent border-none p-0 h-auto w-[80%]"
                                placeholder="NOMBRE DE LA CATEGORÍA / DIMENSIÓN"
                              />
                              <Button variant="ghost" size="icon" className="text-red-300" onClick={() => setEditorCriteria(editorCriteria.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {rc.levels.map((lvl: any, lIdx: number) => (
                                <div key={lIdx} className="bg-white p-3 rounded-xl border text-[10px] space-y-2">
                                  <p className="font-black text-slate-400 text-[8px] uppercase">{lvl.label}</p>
                                  <textarea 
                                    value={lvl.description} 
                                    onChange={e => {
                                      const next = [...editorCriteria]
                                      next[idx].levels[lIdx].description = e.target.value
                                      setEditorCriteria(next)
                                    }}
                                    className="w-full resize-none border-none outline-none font-medium h-16 leading-tight text-slate-600"
                                    placeholder="Desempeño..."
                                  />
                                  <p className="font-black text-primary text-right">{lvl.points} pts</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <Button variant="ghost" className="w-full border-2 border-dashed h-12 rounded-2xl text-slate-400 hover:border-primary hover:text-primary font-bold" onClick={() => setEditorCriteria([...editorCriteria, { id: Date.now().toString(), category: "Nueva Dimensión", levels: JSON.parse(JSON.stringify(RUBRIC_LEVELS_DEFAULT)) }])}>
                          + Añadir Nueva Dimensión de Rúbrica
                        </Button>
                      </div>
                    )}

                    {newColType === 'manual' && (
                      <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-4">
                        <FileText className="h-12 w-12 opacity-20" />
                        <p className="font-bold text-center">La evaluación manual no requiere criterios previos.<br/>Podrás ingresar notas del 0 al 20 directamente.</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>

            <div className="p-10 bg-slate-50 border-t flex justify-between gap-3">
              <Button variant="ghost" onClick={() => setSetupStep(p => Math.max(0, p - 1))} disabled={setupStep === 0} className="font-black text-[10px] uppercase tracking-widest">Anterior</Button>
              <div className="flex gap-3">
                {setupStep < 2 ? (
                  <Button className="bg-primary px-8 font-black text-[10px] uppercase tracking-widest rounded-xl" onClick={() => setSetupStep(p => p + 1)} disabled={(setupStep === 0 && !selectedIndicator) || (setupStep === 1 && !newColName)}>Siguiente Paso</Button>
                ) : (
                  <Button className="bg-primary px-10 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20" onClick={addColumn}>Finalizar Configuración</Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-[2.5rem]">
        <div className="p-8 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative w-full md:w-[450px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Buscar estudiante por apellidos o nombres..." 
              className="pl-14 h-14 border-none shadow-inner rounded-2xl bg-white font-medium text-lg"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Instrumentos</span>
               <span className="text-xl font-black text-primary">{columns.length} activos</span>
             </div>
             <div className="h-10 w-px bg-slate-200 mx-2" />
             <Button variant="outline" className="h-12 px-6 border-slate-200 rounded-xl font-bold gap-2">
               <Save className="h-4 w-4" /> Guardar Todo
             </Button>
          </div>
        </div>
        
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow className="border-none">
                  <TableHead className="pl-10 font-black text-[10px] uppercase text-slate-400 tracking-widest w-[350px]">Estudiante</TableHead>
                  {columns.map(c => (
                    <TableHead key={c.id} className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest px-6 border-l min-w-[150px]">
                      <div className="flex flex-col items-center gap-1.5">
                        <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 text-[8px] px-2 py-0">
                          {INDICATORS.find(i => i.id === c.indicatorId)?.code}
                        </Badge>
                        <span className="text-slate-900 truncate w-32">{c.name}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-black text-[10px] uppercase text-primary tracking-widest bg-primary/5 w-[120px] border-l">Promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50 border-slate-50 transition-all group">
                      <TableCell className="pl-10 py-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-white shadow-md ring-primary/5 group-hover:ring-primary/20 transition-all">
                            <AvatarFallback className="bg-primary/5 text-primary font-black text-sm">{getInitials(s.nombre)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-base text-slate-800 uppercase tracking-tight">{s.nombre}</span>
                            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">DNI: {s.dni}</span>
                          </div>
                        </div>
                      </TableCell>
                      {columns.map(c => (
                        <TableCell key={c.id} className="text-center px-6 border-l">
                          <div className="flex items-center justify-center gap-3">
                            <Input 
                              type="number" 
                              className={`w-16 h-11 text-center font-black text-lg border-none shadow-sm rounded-xl transition-all ${
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
                                    className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary transition-all border border-primary/10"
                                    onClick={() => { setActiveEval({ student: s, column: c }); setEvalData({}); }}
                                  >
                                    <Target className="h-5 w-5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-5xl p-0 overflow-hidden border-none shadow-2xl rounded-[3rem]">
                                  {activeEval && (
                                    <div className="flex flex-col h-[90vh]">
                                      <div className="bg-primary p-10 text-white flex justify-between items-center shrink-0">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-3">
                                            <Badge className="bg-white/20 text-white font-mono">{activeEval.column.type.toUpperCase()}</Badge>
                                            <span className="text-blue-200 font-black text-xs uppercase tracking-widest">{INDICATORS.find(i => i.id === activeEval.column.indicatorId)?.code}</span>
                                          </div>
                                          <h3 className="text-3xl font-black uppercase tracking-tight">{activeEval.student.nombre}</h3>
                                          <p className="flex items-center gap-2 text-blue-100/80 font-bold uppercase text-[10px] tracking-widest">
                                            Evaluación: {activeEval.column.name}
                                          </p>
                                        </div>
                                        <div className="bg-white/10 p-6 rounded-3xl border border-white/10 text-center min-w-[150px]">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">Puntaje</p>
                                          <p className="text-5xl font-black font-mono">
                                            {
                                              activeEval.column.type === 'cotejo' 
                                              ? Object.entries(evalData).reduce((acc, [idx, val]) => val === true ? acc + (instruments[activeEval.column.instrumentId].criteria[parseInt(idx)].points) : acc, 0)
                                              : Object.values(evalData).reduce((acc, v) => acc + (v as number), 0)
                                            }
                                          </p>
                                        </div>
                                      </div>

                                      <ScrollArea className="flex-grow p-10 bg-slate-50">
                                        {activeEval.column.type === 'cotejo' ? (
                                          <div className="space-y-4">
                                            <div className="grid grid-cols-[1fr_100px_100px] gap-6 px-6 py-3 font-black text-[11px] uppercase text-slate-400 tracking-widest">
                                              <span>Criterios de Evaluación</span>
                                              <span className="text-center">LOGRADO</span>
                                              <span className="text-center">NO LOGRADO</span>
                                            </div>
                                            {instruments[activeEval.column.instrumentId].criteria.map((cr: any, i: number) => (
                                              <div key={i} className="grid grid-cols-[1fr_100px_100px] gap-6 items-center p-6 bg-white rounded-[2rem] shadow-sm border border-slate-100 hover:border-primary/20 transition-all group">
                                                <div className="space-y-1">
                                                  <p className="text-sm font-bold text-slate-700 leading-relaxed">{i + 1}. {cr.description}</p>
                                                  <Badge variant="outline" className="text-[9px] font-black text-slate-400 border-slate-200">{cr.points} PUNTOS</Badge>
                                                </div>
                                                <div className="flex justify-center">
                                                  <Button 
                                                    variant="ghost" 
                                                    className={`h-14 w-14 rounded-2xl transition-all ${evalData[i] === true ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-200 scale-110' : 'text-slate-200 hover:bg-emerald-50 hover:text-emerald-500'}`}
                                                    onClick={() => setEvalData(p => ({ ...p, [i]: true }))}
                                                  >
                                                    <CheckCircle2 className="h-8 w-8" />
                                                  </Button>
                                                </div>
                                                <div className="flex justify-center">
                                                  <Button 
                                                    variant="ghost" 
                                                    className={`h-14 w-14 rounded-2xl transition-all ${evalData[i] === false ? 'bg-red-500 text-white shadow-xl shadow-red-200 scale-110' : 'text-slate-200 hover:bg-red-50 hover:text-red-500'}`}
                                                    onClick={() => setEvalData(p => ({ ...p, [i]: false }))}
                                                  >
                                                    <XCircle className="h-8 w-8" />
                                                  </Button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="space-y-12">
                                            {instruments[activeEval.column.instrumentId].criteria.map((rc: any, i: number) => (
                                              <div key={i} className="space-y-6">
                                                <div className="flex items-center gap-4">
                                                  <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">{i + 1}</div>
                                                  <Label className="text-lg font-black uppercase text-slate-800 tracking-tight">{rc.category}</Label>
                                                </div>
                                                <div className="grid grid-cols-5 gap-4">
                                                  {(rc.levels || []).map((lvl: any) => (
                                                    <Button 
                                                      key={lvl.label}
                                                      variant="outline"
                                                      className={`h-auto flex-col gap-3 p-6 rounded-[2rem] border-2 transition-all text-left items-start ${
                                                        evalData[i] === lvl.points 
                                                        ? 'border-primary bg-primary/5 ring-8 ring-primary/5' 
                                                        : 'border-white bg-white hover:border-slate-200 hover:shadow-lg'
                                                      }`}
                                                      onClick={() => setEvalData(p => ({ ...p, [i]: lvl.points }))}
                                                    >
                                                      <div className="flex justify-between w-full">
                                                        <span className={`font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full ${evalData[i] === lvl.points ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                          {lvl.label}
                                                        </span>
                                                        <span className="font-black text-sm text-slate-900">{lvl.points} PTS</span>
                                                      </div>
                                                      <p className="text-[11px] leading-relaxed text-slate-500 font-medium h-20 overflow-hidden">{lvl.description}</p>
                                                    </Button>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </ScrollArea>

                                      <div className="p-10 bg-white border-t flex justify-end gap-4 shrink-0">
                                        <Button variant="ghost" className="font-black text-slate-400 uppercase text-xs tracking-[0.2em]" onClick={() => setActiveEval(null)}>Descartar</Button>
                                        <Button 
                                          className="bg-primary font-black uppercase text-xs tracking-[0.2em] px-12 h-14 rounded-2xl shadow-2xl shadow-primary/30"
                                          onClick={applyInstrumentScore}
                                        >
                                          Confirmar y Vaciar Nota
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
                        <span className={`text-xl font-black font-mono ${calculateFinal(s.id) < 13 ? 'text-red-600' : 'text-primary'}`}>
                          {calculateFinal(s.id).toString().padStart(2, '0')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="h-64 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-4">
                        <Settings2 className="h-16 w-16 opacity-5" />
                        <p className="font-bold text-slate-900 uppercase tracking-widest text-xs">No hay estudiantes o instrumentos configurados</p>
                      </div>
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
        <Card className="p-24 border-4 border-dashed border-slate-100 bg-white rounded-[3rem] flex flex-col items-center gap-6 text-slate-400">
          <div className="p-8 bg-slate-50 rounded-full">
            <AlertTriangle className="h-16 w-16 opacity-20" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Registro Vacío</p>
            <p className="text-sm font-medium max-w-sm">Configura tu primera evaluación vinculándola a un indicador de logro del sílabo.</p>
          </div>
          <Button className="h-14 px-10 bg-primary font-black rounded-2xl uppercase text-xs tracking-widest gap-3" onClick={() => setIsNewColOpen(true)}>
            <PlusCircle className="h-5 w-5" /> Iniciar Configuración
          </Button>
        </Card>
      )}
    </div>
  )
}
