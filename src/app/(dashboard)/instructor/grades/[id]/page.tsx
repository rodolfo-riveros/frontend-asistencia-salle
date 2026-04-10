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
  AlertTriangle,
  GripVertical,
  BookOpen,
  Info,
  Sparkles,
  Camera,
  Upload,
  Loader2,
  X,
  MessageSquare,
  Star,
  Quote
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { getInitials } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { analyzeInstrument, type AnalyzeInstrumentOutput } from "@/ai/flows/analyze-instrument-flow"

// --- Tipos ---
type ColumnType = 'manual' | 'cotejo' | 'rubrica' | 'escala' | 'anecdotario'

interface ChecklistCriterion {
  id: string
  description: string
  points: number
}

interface RubricLevel {
  label: string
  points: number
  description: string
}

interface RubricDimension {
  id: string
  category: string
  levels: RubricLevel[]
}

interface Instrument {
  id: string
  name: string
  type: ColumnType
  criteria: any[] 
  scaleLevels?: { label: string, points: number }[]
}

interface Column {
  id: string
  name: string
  indicatorCode: string
  indicatorDescription: string
  type: ColumnType
  instrumentId: string
}

const DEFAULT_RUBRIC_LEVELS: RubricLevel[] = [
  { label: 'Excelente', points: 4, description: '' },
  { label: 'Bueno', points: 3, description: '' },
  { label: 'Regular', points: 2, description: '' },
  { label: 'Deficiente', points: 1, description: '' },
  { label: 'No presenta', points: 0, description: '' },
]

const DEFAULT_SCALE_LEVELS = [
  { label: 'Excelente (5)', points: 5 },
  { label: 'Bueno (4)', points: 4 },
  { label: 'Regular (3)', points: 3 },
  { label: 'Deficiente (2)', points: 2 },
  { label: 'Muy Deficiente (1)', points: 1 },
]

export default function AcademicGradebookPage() {
  const params = useParams()
  const router = useRouter()
  
  const [students, setStudents] = React.useState<any[]>([])
  const [columns, setColumns] = React.useState<Column[]>([])
  const [instruments, setInstruments] = React.useState<Record<string, Instrument>>({})
  const [grades, setGrades] = React.useState<Record<string, Record<string, number>>>({})
  const [comments, setComments] = React.useState<Record<string, Record<string, string>>>({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  
  // Modals
  const [isNewColOpen, setIsNewColOpen] = React.useState(false)
  const [activeEval, setActiveEval] = React.useState<{ student: any, column: Column } | null>(null)
  const [evalData, setEvalData] = React.useState<Record<string, any>>({})
  const [evalComment, setEvalComment] = React.useState("")

  // Multi-step Editor State
  const [setupStep, setSetupStep] = React.useState(0)
  const [newIndicatorCode, setNewIndicatorCode] = React.useState("")
  const [newIndicatorDescription, setNewIndicatorDescription] = React.useState("")
  const [newColType, setNewColType] = React.useState<ColumnType>('manual')
  const [newColName, setNewColName] = React.useState("")
  const [editorCriteria, setEditorCriteria] = React.useState<any[]>([])
  const [editorScaleLevels, setEditorScaleLevels] = React.useState<any[]>(DEFAULT_SCALE_LEVELS)

  // AI Scanner State
  const [isScanning, setIsScanning] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const existingIndicators = React.useMemo(() => {
    const map = new Map<string, string>();
    columns.forEach(c => map.set(c.indicatorCode, c.indicatorDescription));
    return Array.from(map.entries()).map(([code, desc]) => ({ code, desc }));
  }, [columns]);

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
      const initialComments: any = {}
      data.forEach(s => { 
        initialGrades[s.id] = {} 
        initialComments[s.id] = {}
      })
      setGrades(initialGrades)
      setComments(initialComments)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los alumnos." })
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  React.useEffect(() => { fetchStudents() }, [fetchStudents])

  const handleAiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    toast({ title: "Escaneando Instrumento", description: "La IA está detectando el tipo de instrumento y sus criterios..." })

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        const analysis = await analyzeInstrument({ photoDataUri: base64 })
        
        setNewColType(analysis.type)
        setNewColName(analysis.name)
        
        if (analysis.type === 'cotejo' && analysis.checklistCriteria) {
          setEditorCriteria(analysis.checklistCriteria.map(c => ({ id: Math.random().toString(), ...c })))
        } else if (analysis.type === 'rubrica' && analysis.rubricDimensions) {
          setEditorCriteria(analysis.rubricDimensions.map(d => ({ id: Math.random().toString(), ...d })))
        } else if (analysis.type === 'escala' && analysis.checklistCriteria) {
          setEditorCriteria(analysis.checklistCriteria.map(c => ({ id: Math.random().toString(), description: c.description })))
          if (analysis.scaleLevels) setEditorScaleLevels(analysis.scaleLevels)
        } else if (analysis.type === 'anecdotario' && analysis.checklistCriteria) {
          setEditorCriteria(analysis.checklistCriteria.map(c => ({ id: Math.random().toString(), description: c.description })))
        }

        setSetupStep(2)
        toast({ title: "Análisis Exitoso", description: `Se identificó un instrumento de tipo: ${analysis.type.toUpperCase()}` })
      }
      reader.readAsDataURL(file)
    } catch (err) {
      toast({ variant: "destructive", title: "Error de IA", description: "No se pudo procesar la imagen." })
    } finally {
      setIsScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const addColumn = () => {
    if (newColType === 'cotejo' && totalPointsChecklist !== 20) {
      toast({ variant: "destructive", title: "Puntaje Inválido", description: "La suma debe ser exactamente 20 puntos." })
      return
    }

    const id = `col-${Date.now()}`
    const instId = `inst-${Date.now()}`
    
    const newInstrument: Instrument = {
      id: instId,
      name: newColName,
      type: newColType,
      criteria: editorCriteria,
      scaleLevels: newColType === 'escala' ? editorScaleLevels : undefined
    }

    const newColumn: Column = {
      id,
      name: newColName,
      indicatorCode: newIndicatorCode,
      indicatorDescription: newIndicatorDescription,
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
    toast({ title: "Evaluación Creada" })
  }

  const resetEditor = () => {
    setSetupStep(0)
    setNewIndicatorCode("")
    setNewIndicatorDescription("")
    setNewColName("")
    setNewColType('manual')
    setEditorCriteria([])
    setEditorScaleLevels(DEFAULT_SCALE_LEVELS)
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
    } else if (inst.type === 'rubrica' || inst.type === 'escala') {
      Object.values(evalData).forEach(pts => score += (pts as number))
      // Si es escala, normalizar a 20 si es necesario (ej: si son 4 items de 5 pts cada uno)
    } else if (inst.type === 'anecdotario') {
      // En anecdotario la nota suele ser manual o basada en cumplimiento
      score = Object.values(evalData).filter(v => v === true).length * (20 / inst.criteria.length)
    }

    handleGradeChange(activeEval.student.id, activeEval.column.id, Math.round(score).toString())
    
    // Guardar comentario
    if (evalComment) {
      setComments(prev => ({
        ...prev,
        [activeEval.student.id]: { ...prev[activeEval.student.id], [activeEval.column.id]: evalComment }
      }))
    }

    setActiveEval(null)
    setEvalData({})
    setEvalComment("")
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
              <h2 className="text-4xl font-headline font-black tracking-tight text-slate-900">Registro Auxiliar IA</h2>
              <p className="text-slate-500 font-medium italic">Digitalización de Instrumentos Pedagógicos</p>
            </div>
          </div>
        </div>

        <Dialog open={isNewColOpen} onOpenChange={(o) => { setIsNewColOpen(o); if(!o) resetEditor(); }}>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 gap-3 bg-primary hover:bg-primary/90 font-black shadow-xl shadow-primary/30 rounded-2xl uppercase text-[11px] tracking-widest text-white">
              <PlusCircle className="h-5 w-5" /> Configurar Evaluación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
            <div className="bg-primary p-10 text-white flex justify-between items-end">
              <div>
                <Badge className="bg-white/20 text-white mb-4 border-none font-bold uppercase tracking-widest">IA ASSESSMENT ENGINE</Badge>
                <h3 className="text-3xl font-black uppercase tracking-tight">Cargar Instrumento</h3>
                <p className="text-blue-100/80 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Personaliza o Digitaliza con IA</p>
              </div>
              <div className="flex gap-4">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAiScan} />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isScanning}
                  className="bg-accent hover:bg-accent/90 text-white font-black uppercase text-[10px] tracking-widest gap-2 h-12 rounded-xl shadow-lg border-2 border-white/10"
                >
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Escanear con IA
                </Button>
              </div>
            </div>

            <div className="p-10 space-y-8 bg-white min-h-[500px]">
              {setupStep === 0 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1 bg-primary rounded-full" />
                      <Label className="font-black text-xs uppercase text-primary tracking-widest">1. Indicador de Logro</Label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-1 space-y-3">
                        <Label className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Código</Label>
                        <Input value={newIndicatorCode} onChange={e => setNewIndicatorCode(e.target.value.toUpperCase())} placeholder="C1.I1" className="h-12 border-2 rounded-xl font-black text-primary uppercase" />
                      </div>
                      <div className="md:col-span-2 space-y-3">
                        <Label className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Descripción del Indicador</Label>
                        <Textarea value={newIndicatorDescription} onChange={e => setNewIndicatorDescription(e.target.value)} placeholder="Define qué capacidad evaluarás..." className="h-24 border-2 rounded-xl resize-none font-medium text-sm" />
                      </div>
                    </div>

                    {existingIndicators.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <Label className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Usados recientemente:</Label>
                        <div className="flex flex-wrap gap-2">
                          {existingIndicators.map((ind, i) => (
                            <Button key={i} variant="outline" size="sm" className="h-auto py-2 px-4 rounded-xl border-2 hover:border-primary/30" onClick={() => { setNewIndicatorCode(ind.code); setNewIndicatorDescription(ind.desc); }}>
                              <span className="font-black text-xs text-primary">{ind.code}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {setupStep === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1 bg-primary rounded-full" />
                      <Label className="font-black text-xs uppercase text-primary tracking-widest">2. Tipo de Instrumento Pedagógico</Label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {[
                        { id: 'manual', label: 'Nota Directa', icon: FileText },
                        { id: 'cotejo', label: 'Lista / Test', icon: LayoutList },
                        { id: 'rubrica', label: 'Rúbrica', icon: Target },
                        { id: 'escala', label: 'Escala Valor.', icon: Star },
                        { id: 'anecdotario', label: 'Observación', icon: Quote }
                      ].map((t) => (
                        <Button 
                          key={t.id}
                          variant="outline" 
                          className={`h-auto py-6 flex-col gap-2 rounded-2xl border-2 transition-all ${newColType === t.id ? 'border-primary bg-primary/5' : 'hover:border-slate-200'}`}
                          onClick={() => {
                            setNewColType(t.id as ColumnType)
                            if (t.id === 'cotejo' && editorCriteria.length === 0) setEditorCriteria([{ id: '1', description: '', points: 2 }])
                            if (t.id === 'rubrica' && editorCriteria.length === 0) setEditorCriteria([{ id: '1', category: '', levels: JSON.parse(JSON.stringify(DEFAULT_RUBRIC_LEVELS)) }])
                            if (t.id === 'escala' && editorCriteria.length === 0) setEditorCriteria([{ id: '1', description: '' }])
                            if (t.id === 'anecdotario' && editorCriteria.length === 0) setEditorCriteria([{ id: '1', description: 'Participación' }, { id: '2', description: 'Actitud' }])
                          }}
                        >
                          <t.icon className={`h-6 w-6 ${newColType === t.id ? 'text-primary' : 'text-slate-300'}`} />
                          <span className="font-black text-[9px] uppercase tracking-tighter">{t.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="font-black text-[11px] uppercase text-primary tracking-widest">Nombre de la Actividad</Label>
                    <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Ej. Práctica Calificada de Redes" className="h-14 rounded-xl text-lg font-bold border-2" />
                  </div>
                </div>
              )}

              {setupStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border-2 border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary text-white rounded-xl"><ClipboardCheck className="h-5 w-5" /></div>
                      <div>
                        <p className="font-black text-[10px] uppercase text-slate-400 tracking-widest">{newColType.toUpperCase()}</p>
                        <p className="font-bold text-slate-700 text-lg">{newColName}</p>
                      </div>
                    </div>
                    {newColType === 'cotejo' && (
                      <Badge className={`h-10 px-6 rounded-xl font-black ${totalPointsChecklist === 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {totalPointsChecklist}/20 pts
                      </Badge>
                    )}
                  </div>

                  <ScrollArea className="h-[450px] pr-4">
                    {newColType === 'cotejo' && (
                      <div className="space-y-3">
                        {editorCriteria.map((cr, idx) => (
                          <div key={idx} className="flex gap-3 items-center bg-white p-3 rounded-xl border-2 border-slate-100 group">
                            <span className="font-black text-xs text-slate-300 w-6">{idx + 1}</span>
                            <Input value={cr.description} onChange={e => { const next = [...editorCriteria]; next[idx].description = e.target.value; setEditorCriteria(next); }} placeholder="Criterio..." className="border-none shadow-none font-bold text-slate-700 flex-1" />
                            <Input type="number" value={cr.points} onChange={e => { const next = [...editorCriteria]; next[idx].points = parseInt(e.target.value) || 0; setEditorCriteria(next); }} className="w-16 h-10 border-2 rounded-lg text-center font-black text-primary" />
                            <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-500" onClick={() => setEditorCriteria(editorCriteria.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        ))}
                        <Button variant="outline" className="w-full border-dashed border-2 h-12 rounded-xl text-slate-400 font-black uppercase text-[10px] tracking-widest" onClick={() => setEditorCriteria([...editorCriteria, { id: Date.now().toString(), description: "", points: 2 }])}>+ Añadir Criterio</Button>
                      </div>
                    )}

                    {newColType === 'rubrica' && (
                      <div className="space-y-8">
                        {editorCriteria.map((rc, idx) => (
                          <div key={idx} className="space-y-4 p-6 bg-slate-50/50 rounded-3xl border-2 border-slate-100">
                            <div className="flex justify-between items-center">
                              <Input value={rc.category} onChange={e => { const next = [...editorCriteria]; next[idx].category = e.target.value; setEditorCriteria(next); }} className="font-black uppercase text-xs tracking-widest text-slate-800 bg-transparent border-none p-0 h-auto" placeholder="NOMBRE DE LA DIMENSIÓN" />
                              <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-500" onClick={() => setEditorCriteria(editorCriteria.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {rc.levels.map((lvl: any, lIdx: number) => (
                                <div key={lIdx} className="bg-white p-3 rounded-xl border-2 border-slate-100 space-y-2">
                                  <Badge variant="outline" className="font-black text-primary text-[8px]">{lvl.points} pts</Badge>
                                  <textarea value={lvl.description} onChange={e => { const next = [...editorCriteria]; next[idx].levels[lIdx].description = e.target.value; setEditorCriteria(next); }} className="w-full resize-none border-none outline-none text-[10px] font-medium h-16 leading-tight" placeholder="..." />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" className="w-full border-dashed border-2 h-12 rounded-xl font-black uppercase text-[10px]" onClick={() => setEditorCriteria([...editorCriteria, { id: Date.now().toString(), category: "", levels: JSON.parse(JSON.stringify(DEFAULT_RUBRIC_LEVELS)) }])}>+ Añadir Fila</Button>
                      </div>
                    )}

                    {newColType === 'escala' && (
                      <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                          <p className="font-black text-[10px] uppercase text-blue-600 mb-3">Definir Niveles de la Escala</p>
                          <div className="flex flex-wrap gap-2">
                            {editorScaleLevels.map((sl, si) => (
                              <div key={si} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                                <span className="text-[10px] font-bold">{sl.label}</span>
                                <Badge className="bg-blue-100 text-blue-700">{sl.points} pts</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          {editorCriteria.map((cr, idx) => (
                            <div key={idx} className="flex gap-3 items-center bg-white p-3 rounded-xl border-2 border-slate-100">
                              <span className="font-black text-xs text-slate-300 w-6">{idx + 1}</span>
                              <Input value={cr.description} onChange={e => { const next = [...editorCriteria]; next[idx].description = e.target.value; setEditorCriteria(next); }} placeholder="Criterio de evaluación..." className="border-none shadow-none font-bold text-slate-700 flex-1" />
                              <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-500" onClick={() => setEditorCriteria(editorCriteria.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ))}
                          <Button variant="outline" className="w-full border-dashed border-2 h-12 rounded-xl text-slate-400 font-black uppercase text-[10px]" onClick={() => setEditorCriteria([...editorCriteria, { id: Date.now().toString(), description: "" }])}>+ Añadir Ítem</Button>
                        </div>
                      </div>
                    )}

                    {newColType === 'anecdotario' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-2"><Quote className="h-4 w-4" /> Instrumento para Registro Anecdótico / Diario de Campo</p>
                          <p className="text-[10px] text-emerald-600 mt-1">Define los puntos clave de observación. Al evaluar, el sistema te permitirá escribir una nota narrativa por alumno.</p>
                        </div>
                        <div className="space-y-3">
                          {editorCriteria.map((cr, idx) => (
                            <div key={idx} className="flex gap-3 items-center bg-white p-3 rounded-xl border-2 border-slate-100">
                              <Input value={cr.description} onChange={e => { const next = [...editorCriteria]; next[idx].description = e.target.value; setEditorCriteria(next); }} placeholder="Punto de observación..." className="border-none shadow-none font-bold text-slate-700 flex-1" />
                              <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-500" onClick={() => setEditorCriteria(editorCriteria.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          ))}
                          <Button variant="outline" className="w-full border-dashed border-2 h-12 rounded-xl text-slate-400 font-black uppercase text-[10px]" onClick={() => setEditorCriteria([...editorCriteria, { id: Date.now().toString(), description: "" }])}>+ Añadir Eje de Observación</Button>
                        </div>
                      </div>
                    )}

                    {newColType === 'manual' && (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4">
                        <FileText className="h-16 w-16 opacity-10" />
                        <p className="font-bold text-xs uppercase tracking-widest">Ingreso de Notas Manual</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>

            <div className="p-10 bg-slate-50 border-t flex justify-between gap-3 items-center">
              <Button variant="ghost" onClick={() => setSetupStep(p => Math.max(0, p - 1))} disabled={setupStep === 0} className="font-black text-[10px] uppercase h-12 px-8 rounded-xl border-2">Anterior</Button>
              <div className="flex gap-3">
                {setupStep < 2 ? (
                  <Button className="bg-primary px-10 h-12 font-black text-[10px] uppercase rounded-xl text-white" onClick={() => setSetupStep(p => p + 1)} disabled={(setupStep === 0 && (!newIndicatorCode || !newIndicatorDescription)) || (setupStep === 1 && !newColName)}>Siguiente Paso</Button>
                ) : (
                  <Button className="bg-primary px-12 h-12 font-black text-[10px] uppercase rounded-xl text-white" onClick={addColumn}>Finalizar Configuración</Button>
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
            <Input placeholder="Buscar alumno..." className="pl-14 h-14 border-none shadow-inner rounded-2xl bg-white font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Button variant="outline" className="h-12 px-6 border-slate-200 rounded-xl font-bold gap-2">
            <Save className="h-4 w-4" /> Guardar Calificaciones
          </Button>
        </div>
        
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow className="border-none">
                  <TableHead className="pl-10 font-black text-[10px] uppercase text-slate-400 tracking-widest w-[300px] py-6">Alumno</TableHead>
                  {columns.map(c => (
                    <TableHead key={c.id} className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest px-6 border-l min-w-[160px]">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="outline" className="border-primary/20 text-primary text-[8px] font-black">{c.indicatorCode}</Badge>
                        <span className="text-slate-900 truncate w-32 font-extrabold">{c.name}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-black text-[10px] uppercase text-primary tracking-widest bg-primary/5 w-[120px] border-l">Promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/50 transition-all group">
                    <TableCell className="pl-10 py-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarFallback className="bg-primary/5 text-primary font-black text-xs">{getInitials(s.nombre)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-slate-800 uppercase truncate w-48">{s.nombre}</span>
                          <span className="text-[10px] text-slate-400 font-mono">DNI: {s.dni}</span>
                        </div>
                      </div>
                    </TableCell>
                    {columns.map(c => (
                      <TableCell key={c.id} className="text-center px-6 border-l">
                        <div className="flex items-center justify-center gap-2">
                          <Input 
                            type="number" 
                            className={`w-14 h-10 text-center font-black text-lg border-none shadow-inner rounded-lg ${
                              (grades[s.id]?.[c.id] || 0) < 13 ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50'
                            }`}
                            value={grades[s.id]?.[c.id] || 0}
                            onChange={e => handleGradeChange(s.id, c.id, e.target.value)}
                          />
                          {c.type !== 'manual' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary border-2 border-primary/5" onClick={() => { setActiveEval({ student: s, column: c }); setEvalData({}); setEvalComment(comments[s.id]?.[c.id] || ""); }}>
                                  <Target className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-6xl p-0 overflow-hidden border-none shadow-2xl rounded-[3rem]">
                                {activeEval && (
                                  <div className="flex flex-col h-[90vh]">
                                    <div className="bg-primary p-10 text-white flex justify-between items-center shrink-0">
                                      <div className="space-y-2">
                                        <Badge className="bg-white/20 text-white font-black uppercase text-[10px]">{activeEval.column.type.toUpperCase()}</Badge>
                                        <h3 className="text-3xl font-black uppercase tracking-tighter">{activeEval.student.nombre}</h3>
                                        <p className="text-blue-100/80 font-bold uppercase text-[10px] tracking-widest">{activeEval.column.name}</p>
                                      </div>
                                      <div className="bg-white/10 p-6 rounded-2xl border-2 border-white/10 text-center min-w-[140px]">
                                        <p className="text-[9px] font-black uppercase text-blue-200 mb-1">Nota Preliminar</p>
                                        <p className="text-5xl font-black font-mono">
                                          {
                                            activeEval.column.type === 'cotejo' || activeEval.column.type === 'anecdotario'
                                            ? Math.round(Object.entries(evalData).reduce((acc, [idx, val]) => val === true ? acc + (instruments[activeEval.column.instrumentId].criteria[parseInt(idx)].points || (20/instruments[activeEval.column.instrumentId].criteria.length)) : acc, 0))
                                            : Object.values(evalData).reduce((acc, v) => acc + (v as number), 0)
                                          }
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex-grow flex overflow-hidden">
                                      <ScrollArea className="w-2/3 p-10 bg-slate-50/50">
                                        {activeEval.column.type === 'cotejo' || activeEval.column.type === 'anecdotario' ? (
                                          <div className="space-y-3">
                                            {instruments[activeEval.column.instrumentId].criteria.map((cr: any, i: number) => (
                                              <div key={i} className="flex items-center justify-between p-5 bg-white rounded-2xl shadow-sm border-2 border-slate-100 hover:border-primary/20 transition-all">
                                                <div className="flex items-center gap-3">
                                                  <span className="font-black text-xs text-slate-300">{i + 1}</span>
                                                  <p className="text-sm font-bold text-slate-700">{cr.description}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                  <Button size="sm" variant="ghost" className={`h-10 w-10 rounded-xl ${evalData[i] === true ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-200'}`} onClick={() => setEvalData(p => ({ ...p, [i]: true }))}><CheckCircle2 className="h-6 w-6" /></Button>
                                                  <Button size="sm" variant="ghost" className={`h-10 w-10 rounded-xl ${evalData[i] === false ? 'bg-red-500 text-white shadow-lg' : 'text-slate-200'}`} onClick={() => setEvalData(p => ({ ...p, [i]: false }))}><XCircle className="h-6 w-6" /></Button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : activeEval.column.type === 'rubrica' ? (
                                          <div className="space-y-10">
                                            {instruments[activeEval.column.instrumentId].criteria.map((rc: any, i: number) => (
                                              <div key={i} className="space-y-4">
                                                <Label className="text-lg font-black uppercase text-slate-800 tracking-tighter">{rc.category}</Label>
                                                <div className="grid grid-cols-5 gap-3">
                                                  {rc.levels.map((lvl: any) => (
                                                    <Button 
                                                      key={lvl.label}
                                                      variant="outline"
                                                      className={`h-auto flex-col gap-3 p-4 rounded-2xl border-2 transition-all text-left items-start ${
                                                        evalData[i] === lvl.points ? 'border-primary bg-primary/5 ring-4 ring-primary/5' : 'bg-white hover:border-slate-200'
                                                      }`}
                                                      onClick={() => setEvalData(p => ({ ...p, [i]: lvl.points }))}
                                                    >
                                                      <div className="flex justify-between w-full">
                                                        <span className="font-black text-[8px] uppercase tracking-widest">{lvl.label}</span>
                                                        <span className="font-black text-xs text-slate-900">{lvl.points} pts</span>
                                                      </div>
                                                      <p className="text-[10px] leading-tight text-slate-500 font-medium h-12 overflow-hidden">{lvl.description || '...'}</p>
                                                    </Button>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="space-y-6">
                                            {instruments[activeEval.column.instrumentId].criteria.map((cr: any, i: number) => (
                                              <div key={i} className="space-y-4 p-6 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                                                <Label className="text-sm font-black uppercase text-slate-700">{cr.description}</Label>
                                                <div className="flex flex-wrap gap-2">
                                                  {instruments[activeEval.column.instrumentId].scaleLevels?.map((sl: any) => (
                                                    <Button 
                                                      key={sl.label}
                                                      variant="outline"
                                                      className={`h-10 px-4 rounded-xl border-2 font-bold text-xs ${evalData[i] === sl.points ? 'bg-primary text-white border-primary shadow-lg' : ''}`}
                                                      onClick={() => setEvalData(p => ({ ...p, [i]: sl.points }))}
                                                    >
                                                      {sl.label}
                                                    </Button>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </ScrollArea>
                                      
                                      <div className="w-1/3 p-10 bg-white border-l space-y-6">
                                        <div className="space-y-3">
                                          <Label className="font-black text-xs uppercase text-slate-400 flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4" /> Observaciones del Docente
                                          </Label>
                                          <Textarea 
                                            value={evalComment} 
                                            onChange={e => setEvalComment(e.target.value)} 
                                            placeholder="Escribe comentarios sobre el desempeño del alumno, fortalezas o debilidades observadas..." 
                                            className="h-[400px] rounded-2xl border-2 resize-none p-6 font-medium italic text-slate-600"
                                          />
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border-2 border-slate-100">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Importante</p>
                                          <p className="text-[10px] text-slate-500 leading-relaxed italic">Estas observaciones quedan vinculadas a esta actividad y podrán ser visualizadas en los reportes individuales del alumno.</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="p-10 bg-white border-t flex justify-end gap-4 shrink-0">
                                      <Button variant="ghost" className="font-black text-slate-400 uppercase text-xs px-8" onClick={() => setActiveEval(null)}>Cancelar</Button>
                                      <Button className="bg-primary font-black uppercase text-xs px-16 h-16 rounded-2xl shadow-xl text-white" onClick={applyInstrumentScore}>Guardar y Vaciar Nota</Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    ))}
                    <TableCell className="text-center bg-primary/5 border-l py-6">
                      <span className={`text-xl font-black font-mono ${calculateFinal(s.id) < 13 ? 'text-red-600' : 'text-primary'}`}>
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

      {columns.length === 0 && !isLoading && (
        <Card className="p-32 border-4 border-dashed border-slate-100 bg-white rounded-[4rem] flex flex-col items-center gap-8 text-slate-400">
          <div className="p-10 bg-slate-50 rounded-full"><AlertTriangle className="h-20 w-20 opacity-10" /></div>
          <div className="text-center space-y-3">
            <p className="text-2xl font-black text-slate-900 uppercase">Sin Evaluaciones Configuradas</p>
            <p className="text-sm font-medium italic">Define tus indicadores y digitaliza tus instrumentos con IA.</p>
          </div>
          <Button className="h-16 px-12 bg-primary font-black rounded-3xl uppercase text-xs gap-4 text-white shadow-2xl" onClick={() => setIsNewColOpen(true)}>
            <PlusCircle className="h-6 w-6" /> Empezar Configuración
          </Button>
        </Card>
      )}
    </div>
  )
}
