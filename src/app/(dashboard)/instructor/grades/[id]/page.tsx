
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
  X
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
type ColumnType = 'manual' | 'cotejo' | 'rubrica'

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
  criteria: any[] // ChecklistCriterion[] o RubricDimension[]
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
  const [newIndicatorCode, setNewIndicatorCode] = React.useState("")
  const [newIndicatorDescription, setNewIndicatorDescription] = React.useState("")
  const [newColType, setNewColType] = React.useState<ColumnType>('manual')
  const [newColName, setNewColName] = React.useState("")
  const [editorCriteria, setEditorCriteria] = React.useState<any[]>([])

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
      data.forEach(s => { initialGrades[s.id] = {} })
      setGrades(initialGrades)
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
    toast({ title: "Analizando Instrumento", description: "La IA está extrayendo los criterios de la imagen..." })

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        const analysis = await analyzeInstrument({ photoDataUri: base64 })
        
        // Aplicar resultados
        setNewColType(analysis.type)
        setNewColName(analysis.name)
        
        if (analysis.type === 'cotejo' && analysis.checklistCriteria) {
          setEditorCriteria(analysis.checklistCriteria.map(c => ({ id: Math.random().toString(), ...c })))
        } else if (analysis.type === 'rubrica' && analysis.rubricDimensions) {
          setEditorCriteria(analysis.rubricDimensions.map(d => ({ id: Math.random().toString(), ...d })))
        }

        setSetupStep(2) // Ir directo al editor para revisión
        toast({ title: "Digitalización Completa", description: "Revisa los criterios extraídos por la IA." })
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
      toast({ variant: "destructive", title: "Puntaje Inválido", description: "La suma de criterios en la lista de cotejo debe ser exactamente 20 puntos." })
      return
    }

    if (newColType !== 'manual' && editorCriteria.length === 0) {
      toast({ variant: "destructive", title: "Sin criterios", description: "Debes añadir al menos un criterio de evaluación." })
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
    toast({ title: "Evaluación Configurada", description: `${newColName} ha sido añadida al registro.` })
  }

  const resetEditor = () => {
    setSetupStep(0)
    setNewIndicatorCode("")
    setNewIndicatorDescription("")
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
              <p className="text-slate-500 font-medium italic">Gestión de Instrumentos de Evaluación Personalizados</p>
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
                <Badge className="bg-white/20 text-white mb-4 border-none font-bold uppercase tracking-widest">PASO {setupStep + 1} DE 3</Badge>
                <h3 className="text-3xl font-black uppercase tracking-tight">Nueva Actividad Evaluable</h3>
                <p className="text-blue-100/80 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Configura el indicador y el instrumento</p>
              </div>
              <div className="flex gap-4">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAiScan} />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isScanning}
                  className="bg-accent hover:bg-accent/90 text-white font-black uppercase text-[10px] tracking-widest gap-2 h-12 rounded-xl shadow-lg border-2 border-white/10"
                >
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Digitalizar con IA
                </Button>
                <Layers className="h-12 w-12 text-white/10" />
              </div>
            </div>

            <div className="p-10 space-y-8 bg-white min-h-[500px]">
              {setupStep === 0 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1 bg-primary rounded-full" />
                      <Label className="font-black text-xs uppercase text-primary tracking-widest">1. Definir Indicador de Logro</Label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-1 space-y-3">
                        <Label className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Código del Indicador</Label>
                        <Input 
                          value={newIndicatorCode} 
                          onChange={e => setNewIndicatorCode(e.target.value.toUpperCase())}
                          placeholder="Ej: C1.I1" 
                          className="h-12 border-2 rounded-xl font-black text-primary uppercase"
                        />
                        <p className="text-[10px] text-slate-400 font-medium leading-tight">Usa una nomenclatura corta para identificarlo en la tabla.</p>
                      </div>
                      <div className="md:col-span-2 space-y-3">
                        <Label className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Descripción del Indicador</Label>
                        <Textarea 
                          value={newIndicatorDescription} 
                          onChange={e => setNewIndicatorDescription(e.target.value)}
                          placeholder="Escribe aquí el texto completo del indicador de logro de acuerdo a tu sílabo..." 
                          className="h-24 border-2 rounded-xl resize-none font-medium text-sm"
                        />
                      </div>
                    </div>

                    {existingIndicators.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-slate-400" />
                          <Label className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Reutilizar indicadores de este curso:</Label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {existingIndicators.map((ind, i) => (
                            <Button 
                              key={i} 
                              variant="outline" 
                              size="sm" 
                              className="h-auto py-2 px-4 rounded-xl border-2 hover:bg-primary/5 hover:border-primary/30 transition-all text-left flex-col items-start gap-0.5"
                              onClick={() => {
                                setNewIndicatorCode(ind.code);
                                setNewIndicatorDescription(ind.desc);
                              }}
                            >
                              <span className="font-black text-xs text-primary">{ind.code}</span>
                              <span className="text-[10px] text-slate-500 font-medium truncate w-48">{ind.desc}</span>
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
                      <Label className="font-black text-xs uppercase text-primary tracking-widest">2. Tipo de Instrumento</Label>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: 'manual', label: 'Nota Manual', icon: FileText, desc: 'Ingreso directo 0-20' },
                        { id: 'cotejo', label: 'Lista de Cotejo', icon: LayoutList, desc: 'Checklist Sí/No con pesos' },
                        { id: 'rubrica', label: 'Rúbrica', icon: Target, desc: 'Matriz de niveles de desempeño' }
                      ].map((t) => (
                        <Button 
                          key={t.id}
                          variant="outline" 
                          className={`h-auto py-8 flex-col gap-3 rounded-2xl border-2 transition-all ${newColType === t.id ? 'border-primary bg-primary/5 ring-4 ring-primary/5' : 'hover:border-slate-200'}`}
                          onClick={() => {
                            setNewColType(t.id as ColumnType)
                            if (t.id === 'cotejo' && editorCriteria.length === 0) setEditorCriteria([{ id: '1', description: '', points: 2 }])
                            if (t.id === 'rubrica' && editorCriteria.length === 0) setEditorCriteria([{ id: '1', category: '', levels: JSON.parse(JSON.stringify(DEFAULT_RUBRIC_LEVELS)) }])
                          }}
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
                    <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Ej. Instalación de Moodle en Local" className="h-14 rounded-xl text-lg font-bold border-2 focus-visible:ring-primary" />
                  </div>
                </div>
              )}

              {setupStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border-2 border-slate-100">
                    <div>
                      <p className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Resumen de Configuración</p>
                      <p className="font-bold text-slate-700 text-lg">{newColName} <span className="text-primary ml-2">({newIndicatorCode})</span></p>
                    </div>
                    {newColType === 'cotejo' && (
                      <div className={`px-6 py-3 rounded-2xl font-black text-lg shadow-sm border-2 ${totalPointsChecklist === 20 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        Total: {totalPointsChecklist}/20 pts
                      </div>
                    )}
                  </div>

                  <ScrollArea className="h-[450px] pr-4">
                    {newColType === 'cotejo' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-[40px_1fr_100px_40px] gap-4 px-4 py-2 font-black text-[10px] uppercase text-slate-400 tracking-widest">
                          <span>N°</span>
                          <span>Descripción del Criterio</span>
                          <span className="text-center">Peso (Pts)</span>
                          <span></span>
                        </div>
                        {editorCriteria.map((cr, idx) => (
                          <div key={idx} className="flex gap-4 items-center bg-white p-4 rounded-2xl border-2 border-slate-100 hover:border-primary/20 transition-all group">
                            <span className="font-black text-sm text-slate-300 w-10 text-center">{idx + 1}</span>
                            <Input 
                              value={cr.description} 
                              onChange={e => {
                                const next = [...editorCriteria]
                                next[idx].description = e.target.value
                                setEditorCriteria(next)
                              }}
                              placeholder="Ej. El alumno instala correctamente el servidor Apache..." 
                              className="border-none bg-transparent shadow-none font-bold text-slate-700 focus-visible:ring-0 text-base flex-1"
                            />
                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border-2 border-slate-100">
                              <input 
                                type="number" 
                                value={cr.points} 
                                onChange={e => {
                                  const next = [...editorCriteria]
                                  next[idx].points = parseInt(e.target.value) || 0
                                  setEditorCriteria(next)
                                }}
                                className="w-12 bg-transparent text-center font-black text-primary outline-none text-lg"
                              />
                            </div>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => setEditorCriteria(editorCriteria.filter((_, i) => i !== idx))}>
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="ghost" className="w-full border-2 border-dashed border-slate-200 h-16 rounded-2xl text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5 font-black uppercase text-xs tracking-widest transition-all" onClick={() => setEditorCriteria([...editorCriteria, { id: Date.now().toString(), description: "", points: 2 }])}>
                          <Plus className="h-4 w-4 mr-2" /> Añadir Nuevo Criterio
                        </Button>
                      </div>
                    )}

                    {newColType === 'rubrica' && (
                      <div className="space-y-10">
                        {editorCriteria.map((rc, idx) => (
                          <div key={idx} className="space-y-6 p-8 bg-slate-50/50 rounded-[2.5rem] border-2 border-slate-100 relative group animate-in zoom-in-95">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3 flex-1 mr-10">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black">{idx + 1}</div>
                                <Input 
                                  value={rc.category} 
                                  onChange={e => {
                                    const next = [...editorCriteria]
                                    next[idx].category = e.target.value
                                    setEditorCriteria(next)
                                  }}
                                  className="font-black uppercase text-sm tracking-widest text-slate-800 bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                                  placeholder="ESCRIBE EL NOMBRE DE LA DIMENSIÓN / CATEGORÍA"
                                />
                              </div>
                              <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-500 rounded-xl" onClick={() => setEditorCriteria(editorCriteria.filter((_, i) => i !== idx))}><Trash2 className="h-5 w-5" /></Button>
                            </div>
                            <div className="grid grid-cols-5 gap-3">
                              {rc.levels.map((lvl: any, lIdx: number) => (
                                <div key={lIdx} className="bg-white p-5 rounded-2xl border-2 border-slate-100 space-y-3 shadow-sm hover:border-primary/20 transition-all">
                                  <div className="flex justify-between items-center">
                                    <p className="font-black text-slate-400 text-[9px] uppercase tracking-widest">{lvl.label}</p>
                                    <Badge variant="outline" className="font-black text-primary border-primary/20 bg-primary/5 text-[10px]">{lvl.points} pts</Badge>
                                  </div>
                                  <textarea 
                                    value={lvl.description} 
                                    onChange={e => {
                                      const next = [...editorCriteria]
                                      next[idx].levels[lIdx].description = e.target.value
                                      setEditorCriteria(next)
                                    }}
                                    className="w-full resize-none border-none outline-none font-medium h-24 leading-tight text-slate-600 text-xs placeholder:text-slate-300"
                                    placeholder="Describe el desempeño esperado..."
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <Button variant="ghost" className="w-full border-2 border-dashed border-slate-200 h-20 rounded-[2rem] text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5 font-black uppercase text-xs tracking-widest transition-all" onClick={() => setEditorCriteria([...editorCriteria, { id: Date.now().toString(), category: "", levels: JSON.parse(JSON.stringify(DEFAULT_RUBRIC_LEVELS)) }])}>
                          <Plus className="h-4 w-4 mr-2" /> Añadir Nueva Fila de Rúbrica
                        </Button>
                      </div>
                    )}

                    {newColType === 'manual' && (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-6">
                        <div className="p-8 bg-slate-50 rounded-full border-2 border-slate-100">
                          <FileText className="h-16 w-16 opacity-20" />
                        </div>
                        <p className="font-bold text-center text-slate-500 max-w-sm">La evaluación manual permite el ingreso directo de notas (0-20) sin necesidad de configurar criterios previos.</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>

            <div className="p-10 bg-slate-50 border-t flex justify-between gap-3 items-center">
              <Button variant="ghost" onClick={() => setSetupStep(p => Math.max(0, p - 1))} disabled={setupStep === 0} className="font-black text-[10px] uppercase tracking-widest h-12 px-8 rounded-xl border-2">Anterior</Button>
              <div className="flex gap-3">
                {setupStep < 2 ? (
                  <Button 
                    className="bg-primary px-10 h-12 font-black text-[10px] uppercase tracking-widest rounded-xl text-white shadow-lg shadow-primary/20" 
                    onClick={() => setSetupStep(p => p + 1)} 
                    disabled={(setupStep === 0 && (!newIndicatorCode || !newIndicatorDescription)) || (setupStep === 1 && !newColName)}
                  >
                    Siguiente Paso
                  </Button>
                ) : (
                  <Button className="bg-primary px-12 h-12 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl shadow-primary/30 text-white" onClick={addColumn}>Finalizar y Guardar Evaluación</Button>
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
              className="pl-14 h-14 border-none shadow-inner rounded-2xl bg-white font-medium text-lg focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Actividades</span>
               <span className="text-xl font-black text-primary">{columns.length} configuradas</span>
             </div>
             <div className="h-10 w-px bg-slate-200 mx-2" />
             <Button variant="outline" className="h-12 px-6 border-slate-200 rounded-xl font-bold gap-2 hover:bg-slate-50 transition-all">
               <Save className="h-4 w-4" /> Guardar Cambios
             </Button>
          </div>
        </div>
        
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow className="border-none">
                  <TableHead className="pl-10 font-black text-[10px] uppercase text-slate-400 tracking-widest w-[350px] py-6">Estudiante</TableHead>
                  {columns.map(c => (
                    <TableHead key={c.id} className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest px-6 border-l min-w-[160px]">
                      <div className="flex flex-col items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Badge variant="outline" className="cursor-help border-primary/20 text-primary bg-primary/5 text-[8px] px-2 py-0.5 font-black hover:bg-primary/10 transition-all">
                              {c.indicatorCode}
                            </Badge>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Info className="h-5 w-5 text-primary" />
                                Indicador de Logro: {c.indicatorCode}
                              </DialogTitle>
                              <DialogDescription className="pt-4 text-slate-700 font-medium leading-relaxed">
                                {c.indicatorDescription}
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                        <span className="text-slate-900 truncate w-36 font-extrabold">{c.name}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-black text-[10px] uppercase text-primary tracking-widest bg-primary/5 w-[140px] border-l">Promedio Final</TableHead>
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
                              className={`w-16 h-11 text-center font-black text-xl border-none shadow-sm rounded-xl transition-all ${
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
                                    className="h-11 w-11 rounded-2xl hover:bg-primary/10 text-primary transition-all border-2 border-primary/10 group-hover:border-primary/30"
                                    onClick={() => { setActiveEval({ student: s, column: c }); setEvalData({}); }}
                                  >
                                    <Target className="h-5 w-5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-6xl p-0 overflow-hidden border-none shadow-2xl rounded-[3rem]">
                                  {activeEval && (
                                    <div className="flex flex-col h-[90vh]">
                                      <div className="bg-primary p-10 text-white flex justify-between items-center shrink-0">
                                        <div className="space-y-3">
                                          <div className="flex items-center gap-3">
                                            <Badge className="bg-white/20 text-white font-black uppercase text-[10px] tracking-widest border-none px-3">{activeEval.column.type.toUpperCase()}</Badge>
                                            <span className="text-blue-200 font-black text-xs uppercase tracking-[0.3em]">{activeEval.column.indicatorCode}</span>
                                          </div>
                                          <h3 className="text-4xl font-black uppercase tracking-tighter">{activeEval.student.nombre}</h3>
                                          <p className="flex items-center gap-2 text-blue-100/80 font-bold uppercase text-[11px] tracking-widest">
                                            <ClipboardCheck className="h-4 w-4" /> Evaluando: {activeEval.column.name}
                                          </p>
                                        </div>
                                        <div className="bg-white/10 p-8 rounded-[2rem] border-2 border-white/10 text-center min-w-[180px] shadow-inner">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">Puntaje Obtenido</p>
                                          <p className="text-6xl font-black font-mono">
                                            {
                                              activeEval.column.type === 'cotejo' 
                                              ? Object.entries(evalData).reduce((acc, [idx, val]) => val === true ? acc + (instruments[activeEval.column.instrumentId].criteria[parseInt(idx)].points) : acc, 0)
                                              : Object.values(evalData).reduce((acc, v) => acc + (v as number), 0)
                                            }
                                          </p>
                                        </div>
                                      </div>

                                      <ScrollArea className="flex-grow p-10 bg-slate-50/50">
                                        {activeEval.column.type === 'cotejo' ? (
                                          <div className="space-y-4 max-w-4xl mx-auto">
                                            <div className="grid grid-cols-[1fr_120px_120px] gap-6 px-8 py-4 font-black text-[11px] uppercase text-slate-400 tracking-[0.2em]">
                                              <span>Criterios de Evaluación Configurados</span>
                                              <span className="text-center">LOGRADO</span>
                                              <span className="text-center">NO LOGRADO</span>
                                            </div>
                                            {instruments[activeEval.column.instrumentId].criteria.map((cr: any, i: number) => (
                                              <div key={i} className="grid grid-cols-[1fr_120px_120px] gap-6 items-center p-8 bg-white rounded-[2.5rem] shadow-sm border-2 border-slate-100 hover:border-primary/20 transition-all group animate-in slide-in-from-bottom-2">
                                                <div className="space-y-2">
                                                  <div className="flex items-center gap-3">
                                                    <span className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center font-black text-xs text-slate-400">{i + 1}</span>
                                                    <p className="text-base font-bold text-slate-700 leading-snug">{cr.description}</p>
                                                  </div>
                                                  <Badge variant="outline" className="text-[9px] font-black text-primary border-primary/10 bg-primary/5 px-3 py-0.5">{cr.points} PUNTOS</Badge>
                                                </div>
                                                <div className="flex justify-center">
                                                  <Button 
                                                    variant="ghost" 
                                                    className={`h-16 w-16 rounded-[1.5rem] transition-all duration-300 ${evalData[i] === true ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-200 scale-110' : 'text-slate-200 hover:bg-emerald-50 hover:text-emerald-500'}`}
                                                    onClick={() => setEvalData(p => ({ ...p, [i]: true }))}
                                                  >
                                                    <CheckCircle2 className="h-10 w-10" />
                                                  </Button>
                                                </div>
                                                <div className="flex justify-center">
                                                  <Button 
                                                    variant="ghost" 
                                                    className={`h-16 w-16 rounded-[1.5rem] transition-all duration-300 ${evalData[i] === false ? 'bg-red-500 text-white shadow-xl shadow-red-200 scale-110' : 'text-slate-200 hover:bg-red-50 hover:text-red-500'}`}
                                                    onClick={() => setEvalData(p => ({ ...p, [i]: false }))}
                                                  >
                                                    <XCircle className="h-10 w-10" />
                                                  </Button>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="space-y-16">
                                            {instruments[activeEval.column.instrumentId].criteria.map((rc: any, i: number) => (
                                              <div key={i} className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                                <div className="flex items-center gap-4">
                                                  <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-lg shadow-lg shadow-primary/20">{i + 1}</div>
                                                  <Label className="text-2xl font-black uppercase text-slate-800 tracking-tighter">{rc.category}</Label>
                                                </div>
                                                <div className="grid grid-cols-5 gap-4">
                                                  {(rc.levels || []).map((lvl: any) => (
                                                    <Button 
                                                      key={lvl.label}
                                                      variant="outline"
                                                      className={`h-auto flex-col gap-4 p-8 rounded-[2.5rem] border-2 transition-all text-left items-start min-h-[220px] ${
                                                        evalData[i] === lvl.points 
                                                        ? 'border-primary bg-primary/5 ring-8 ring-primary/5 shadow-xl' 
                                                        : 'border-white bg-white hover:border-slate-200 hover:shadow-lg'
                                                      }`}
                                                      onClick={() => setEvalData(p => ({ ...p, [i]: lvl.points }))}
                                                    >
                                                      <div className="flex justify-between w-full items-center">
                                                        <span className={`font-black text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full ${evalData[i] === lvl.points ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                          {lvl.label}
                                                        </span>
                                                        <span className="font-black text-lg text-slate-900 font-mono">{lvl.points} PTS</span>
                                                      </div>
                                                      <p className="text-[13px] leading-relaxed text-slate-500 font-semibold h-24 overflow-y-auto italic">
                                                        {lvl.description || 'Sin descripción configurada.'}
                                                      </p>
                                                    </Button>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </ScrollArea>

                                      <div className="p-10 bg-white border-t flex justify-end gap-4 shrink-0">
                                        <Button variant="ghost" className="font-black text-slate-400 uppercase text-xs tracking-[0.2em] px-8" onClick={() => setActiveEval(null)}>Descartar Evaluación</Button>
                                        <Button 
                                          className="bg-primary font-black uppercase text-xs tracking-[0.2em] px-16 h-16 rounded-[1.5rem] shadow-2xl shadow-primary/30 text-white hover:bg-primary/90 transition-all"
                                          onClick={applyInstrumentScore}
                                        >
                                          Confirmar y Vaciar Nota en Registro
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
                      <TableCell className="text-center bg-primary/5 border-l py-6">
                        <span className={`text-2xl font-black font-mono ${calculateFinal(s.id) < 13 ? 'text-red-600' : 'text-primary'}`}>
                          {calculateFinal(s.id).toString().padStart(2, '0')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="h-80 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-6">
                        <div className="p-8 bg-slate-50 rounded-full border-2 border-slate-100">
                          <Settings2 className="h-20 w-20 opacity-5" />
                        </div>
                        <p className="font-black text-slate-900 uppercase tracking-[0.2em] text-xs">No hay estudiantes o instrumentos configurados para esta unidad</p>
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
        <Card className="p-32 border-4 border-dashed border-slate-100 bg-white rounded-[4rem] flex flex-col items-center gap-8 text-slate-400 animate-in fade-in zoom-in-95 duration-500">
          <div className="p-10 bg-slate-50 rounded-full border-2 border-slate-100">
            <AlertTriangle className="h-20 w-20 opacity-20" />
          </div>
          <div className="text-center space-y-3">
            <p className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Registro Auxiliar Vacío</p>
            <p className="text-base font-medium max-w-md mx-auto text-slate-500 leading-relaxed italic">Construye tu primer instrumento de evaluación definiendo un indicador de logro personalizado.</p>
          </div>
          <Button className="h-16 px-12 bg-primary font-black rounded-3xl uppercase text-xs tracking-[0.2em] gap-4 text-white shadow-2xl shadow-primary/30 hover:scale-105 transition-all" onClick={() => setIsNewColOpen(true)}>
            <PlusCircle className="h-6 w-6" /> Iniciar Configuración Pedagógica
          </Button>
        </Card>
      )}
    </div>
  )
}
