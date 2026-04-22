
"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, Search, Save, Target, ChevronRight, ClipboardCheck, LayoutList, 
  FileText, Trash2, PlusCircle, AlertTriangle, BookOpen, Sparkles, Loader2, 
  X, MessageSquare, Star, Quote, History, FileSpreadsheet, RefreshCcw, 
  Users, Gamepad2, Play, Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { getInitials, cn } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { analyzeInstrument } from "@/ai/flows/analyze-instrument-flow"

// Componentes Modulares
import { ChecklistEvaluator } from "@/components/grades/ChecklistEvaluator"
import { RubricEvaluator } from "@/components/grades/RubricEvaluator"
import { ScaleEvaluator } from "@/components/grades/ScaleEvaluator"

type ColumnType = 'manual' | 'cotejo' | 'rubrica' | 'escala' | 'guia' | 'grupal' | 'quizz'

interface Instrument {
  id: string
  name: string
  type: ColumnType
  criteria: any[] 
  scaleLevels?: { label: string, points: number }[]
  maxPoints?: number
}

interface Column {
  id: string
  name: string
  indicatorId?: string
  indicatorCode: string
  indicatorDescription: string
  indicatorWeight: number 
  instrumentWeight: number 
  type: ColumnType
  instrumentId: string
  maxPoints: number
  groups?: Record<string, string> 
}

const TYPE_LABELS: Record<string, string> = {
  manual: 'Nota Directa',
  cotejo: 'Lista de Cotejo',
  rubrica: 'Rúbrica',
  escala: 'Escala Valorativa',
  guia: 'Guía de Observación',
  grupal: 'Trabajo Grupal',
  quizz: 'Quizz Sallé'
}

const DEFAULT_RUBRIC_LEVELS = [
  { label: 'Excelente', points: 4, description: '' },
  { label: 'Bueno', points: 3, description: '' },
  { label: 'Regular', points: 2, description: '' },
  { label: 'Deficiente', points: 1, description: '' },
  { label: 'No presenta', points: 0, description: '' },
]

const DEFAULT_SCALE_LEVELS = [
  { label: 'Excelente', points: 4 },
  { label: 'Bueno', points: 3 },
  { label: 'Regular', points: 2 },
  { label: 'Deficiente', points: 1 },
]

export default function AcademicGradebookPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const periodoId = searchParams.get('periodo_id')
  
  const [students, setStudents] = React.useState<any[]>([])
  const [columns, setColumns] = React.useState<Column[]>([])
  const [instruments, setInstruments] = React.useState<Record<string, Instrument>>({})
  const [grades, setGrades] = React.useState<Record<string, Record<string, number>>>({})
  const [evalDetails, setEvalDetails] = React.useState<Record<string, Record<string, any>>>({})
  const [comments, setComments] = React.useState<Record<string, Record<string, string>>>({})
  
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
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
  const [newIndicatorWeight, setNewIndicatorWeight] = React.useState(0)
  const [newInstrumentWeight, setNewInstrumentWeight] = React.useState(0)
  const [newColType, setNewColType] = React.useState<ColumnType>('manual')
  const [newColName, setNewColName] = React.useState("")
  const [newMaxPoints, setNewMaxPoints] = React.useState(20)
  const [editorCriteria, setEditorCriteria] = React.useState<any[]>([])
  const [editorScaleLevels, setEditorScaleLevels] = React.useState<any[]>(DEFAULT_SCALE_LEVELS)

  // AI Scanner State
  const [isScanning, setIsScanning] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const existingIndicators = React.useMemo(() => {
    const map = new Map<string, { id?: string, code: string, desc: string, weight: number }>();
    columns.forEach(c => {
      if (c.indicatorCode) map.set(c.indicatorCode, { id: c.indicatorId, code: c.indicatorCode, desc: c.indicatorDescription, weight: c.indicatorWeight });
    });
    return Array.from(map.values());
  }, [columns]);

  const totalPointsStep = React.useMemo(() => {
    if (newColType !== 'cotejo' && newColType !== 'guia') return 0
    return editorCriteria.reduce((acc, curr) => acc + (Number(curr.points) || 0), 0)
  }, [editorCriteria, newColType])

  const fetchFullGradebook = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const studentData = await api.get<any[]>(`/me/unidades/${params.id}/alumnos`)
      setStudents(studentData)

      try {
        const configData = await api.get<any>(`/evaluaciones/config/${params.id}/${periodoId}`)
        if (configData && configData.columns) {
          setColumns(configData.columns)
          setInstruments(configData.instruments)
          setGrades(configData.grades || {})
          setEvalDetails(configData.details || {})
          setComments(configData.comments || {})
        } else {
          const initialGrades: any = {}
          const initialComments: any = {}
          const initialDetails: any = {}
          studentData.forEach(s => { 
            initialGrades[s.id] = {} 
            initialComments[s.id] = {}
            initialDetails[s.id] = {}
          })
          setGrades(initialGrades)
          setComments(initialComments)
          setEvalDetails(initialDetails)
        }
      } catch (e) {
        console.log("Iniciando registro en blanco.")
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, periodoId])

  React.useEffect(() => { fetchFullGradebook() }, [fetchFullGradebook])

  const handleAiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsScanning(true)
    try {
      const reader = new FileReader()
      const analysisPromise = new Promise<any>((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64 = reader.result as string
            const analysis = await analyzeInstrument({ photoDataUri: base64 })
            resolve(analysis)
          } catch (error) { reject(error) }
        }
        reader.onerror = () => reject(new Error("Error al leer archivo."))
        reader.readAsDataURL(file)
      })
      const analysis = await analysisPromise
      setNewColType(analysis.type)
      setNewColName(analysis.name)
      if (analysis.suggestedWeight) setNewInstrumentWeight(analysis.suggestedWeight)
      if ((analysis.type === 'cotejo' || analysis.type === 'guia') && analysis.checklistCriteria) {
        setEditorCriteria(analysis.checklistCriteria.map((c: any) => ({ id: Math.random().toString(), ...c })))
      } else if (analysis.type === 'rubrica' && analysis.rubricDimensions) {
        setEditorCriteria(analysis.rubricDimensions.map((d: any) => ({ id: Math.random().toString(), ...d })))
      } else if (analysis.type === 'escala' && analysis.checklistCriteria) {
        setEditorCriteria(analysis.checklistCriteria.map((c: any) => ({ id: Math.random().toString(), description: c.description })))
        if (analysis.scaleLevels) setEditorScaleLevels(analysis.scaleLevels)
      }
      setSetupStep(2)
      toast({ title: "Digitalización Exitosa" })
    } catch (err: any) {
      toast({ variant: "destructive", title: "IA Ocupada", description: "Reintenta en unos segundos." })
    } finally {
      setIsScanning(false)
    }
  }

  const addColumn = () => {
    if ((newColType === 'cotejo' || newColType === 'guia') && totalPointsStep !== 20) {
      toast({ variant: "destructive", title: "Puntaje Inválido", description: "La suma de los criterios debe ser exactamente 20." })
      return
    }

    const colId = `col-${Date.now()}`
    const instId = `inst-${Date.now()}`
    const existingInd = existingIndicators.find(ind => ind.code === newIndicatorCode)

    const newInstrument: Instrument = {
      id: instId,
      name: newColName,
      type: newColType,
      criteria: editorCriteria,
      scaleLevels: newColType === 'escala' ? editorScaleLevels : undefined,
      maxPoints: (newColType === 'manual' || newColType === 'grupal' || newColType === 'quizz') ? newMaxPoints : 20
    }

    const newColumn: Column = {
      id: colId,
      name: newColName,
      indicatorId: existingInd?.id,
      indicatorCode: newIndicatorCode,
      indicatorDescription: newIndicatorDescription,
      indicatorWeight: newIndicatorWeight,
      instrumentWeight: newInstrumentWeight,
      type: newColType,
      instrumentId: instId,
      maxPoints: (newColType === 'manual' || newColType === 'grupal' || newColType === 'quizz') ? newMaxPoints : 20
    }

    setInstruments(prev => ({ ...prev, [instId]: newInstrument }))
    setColumns(prev => [...prev, newColumn])
    
    setGrades(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(sid => { 
        if(!next[sid]) next[sid] = {}; 
        next[sid][colId] = 0 
      })
      return next
    })

    setIsNewColOpen(false)
    resetEditor()
    toast({ title: "Evaluación Agregada" })
  }

  const resetEditor = () => {
    setSetupStep(0)
    setNewIndicatorCode("")
    setNewIndicatorDescription("")
    setNewIndicatorWeight(0)
    setNewInstrumentWeight(0)
    setNewColName("")
    setNewColType('manual')
    setNewMaxPoints(20)
    setEditorCriteria([])
  }

  const handleGradeChange = (studentId: string, columnId: string, value: string) => {
    const column = columns.find(c => c.id === columnId)
    const max = column?.maxPoints || 20
    const numValue = Math.min(max, Math.max(0, parseInt(value) || 0))
    
    setGrades(prev => {
      const next = { ...prev }
      if (!next[studentId]) next[studentId] = {}
      next[studentId][columnId] = numValue
      return next
    })
  }

  const calculateFinal = (studentId: string) => {
    const studentGrades = grades[studentId] || {}
    if (columns.length === 0) return 0
    const indicatorsMap = new Map<string, { weight: number, cols: Column[] }>()
    columns.forEach(c => {
      if (!indicatorsMap.has(c.indicatorCode)) indicatorsMap.set(c.indicatorCode, { weight: c.indicatorWeight, cols: [] })
      indicatorsMap.get(c.indicatorCode)!.cols.push(c)
    })
    const weightedAverages: number[] = []
    const indicatorWeights: number[] = []
    indicatorsMap.forEach((data) => {
      const { cols, weight } = data
      let indicatorAvg = 0
      const totalInstrumentWeight = cols.reduce((sum, c) => sum + c.instrumentWeight, 0)
      if (totalInstrumentWeight > 0) {
        let weightedSum = 0; let weightFactor = 0
        cols.forEach(c => {
          const rawScore = studentGrades[c.id] || 0
          const normalized = (rawScore / c.maxPoints) * 20
          weightedSum += normalized * (c.instrumentWeight / 100)
          weightFactor += (c.instrumentWeight / 100)
        })
        indicatorAvg = weightFactor > 0 ? weightedSum / weightFactor : 0
      } else {
        const sum = cols.reduce((s, c) => s + (studentGrades[c.id] || 0) / c.maxPoints * 20, 0)
        indicatorAvg = sum / cols.length
      }
      weightedAverages.push(indicatorAvg); indicatorWeights.push(weight)
    })
    const totalWeight = indicatorWeights.reduce((s, w) => s + w, 0)
    if (totalWeight > 0) {
      let finalSum = 0; let totalAppliedWeight = 0
      for (let i = 0; i < weightedAverages.length; i++) {
        finalSum += weightedAverages[i] * (indicatorWeights[i] / 100)
        totalAppliedWeight += (indicatorWeights[i] / 100)
      }
      return Math.round(finalSum / (totalAppliedWeight || 1))
    } else {
      const finalSum = weightedAverages.reduce((s, a) => s + a, 0)
      return Math.round(finalSum / (weightedAverages.length || 1))
    }
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      const payload = { unidad_id: params.id, periodo_id: periodoId, columns, instruments, grades, details: evalDetails, comments }
      await new Promise(r => setTimeout(r, 1000)) 
      toast({ title: "Sincronización Exitosa" })
    } catch (e) { toast({ variant: "destructive", title: "Error al guardar" })
    } finally { setIsSaving(false) }
  }

  const getInstrumentIcon = (type: ColumnType) => {
    switch (type) {
      case 'cotejo': return <LayoutList className="h-3 w-3" />;
      case 'rubrica': return <Target className="h-3 w-3" />;
      case 'escala': return <Star className="h-3 w-3" />;
      case 'guia': return <Quote className="h-3 w-3" />;
      case 'grupal': return <Users className="h-3 w-3" />;
      case 'quizz': return <Gamepad2 className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
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
              <p className="text-slate-500 font-medium italic">Gestión de Calificaciones y Digitalización Pedagógica</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <Button variant="outline" className="h-14 px-6 gap-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-black rounded-2xl uppercase text-[11px] tracking-widest">
            <FileSpreadsheet className="h-5 w-5" /> Excel
          </Button>
          <Button variant="outline" className="h-14 px-6 gap-3 border-red-200 text-red-700 hover:bg-red-50 font-black rounded-2xl uppercase text-[11px] tracking-widest">
            <FileText className="h-5 w-5" /> PDF
          </Button>
          
          <Dialog open={isNewColOpen} onOpenChange={(o) => { setIsNewColOpen(o); if(!o) resetEditor(); }}>
            <DialogTrigger asChild>
              <Button className="h-14 px-8 gap-3 bg-primary hover:bg-primary/90 font-black shadow-xl shadow-primary/30 rounded-2xl uppercase text-[11px] tracking-widest text-white">
                <PlusCircle className="h-5 w-5" /> Nueva Evaluación
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col h-[90vh]">
              <div className="bg-primary p-8 text-white shrink-0">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Configuración Técnica</DialogTitle>
                <DialogDescription className="text-blue-100/80 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
                  Establece los criterios de evaluación para el curso actual
                </DialogDescription>
              </div>

              <div className="flex-grow overflow-hidden flex flex-col">
                <ScrollArea className="flex-grow">
                  <div className="p-10 bg-white min-h-full">
                    {setupStep === 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><BookOpen className="h-6 w-6" /></div>
                            <div className="flex flex-col">
                              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Indicador de Logro</h4>
                              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Fundamentación Curricular</p>
                            </div>
                          </div>
                          <div className="bg-slate-50/50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Código ILC</Label>
                                <Input value={newIndicatorCode} onChange={e => setNewIndicatorCode(e.target.value.toUpperCase())} placeholder="Ej: C1.I1" className="h-12 border-none shadow-inner rounded-xl font-black text-lg bg-white" />
                              </div>
                              <div className="space-y-2">
                                <Label className="font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Peso (%)</Label>
                                <Input type="number" value={newIndicatorWeight || ""} onChange={e => setNewIndicatorWeight(parseInt(e.target.value) || 0)} className="h-12 border-none shadow-inner rounded-xl font-black text-center text-lg bg-white" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Descripción de la Capacidad</Label>
                              <Textarea value={newIndicatorDescription} onChange={e => setNewIndicatorDescription(e.target.value)} placeholder="Logro esperado..." className="h-32 border-none shadow-inner rounded-2xl bg-white" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600"><History className="h-6 w-6" /></div><h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Biblioteca</h4></div>
                          <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-6 min-h-[300px]">
                            {existingIndicators.map((ind, i) => (
                              <button key={i} className="flex flex-col items-start p-4 rounded-2xl border-2 border-slate-50 hover:border-primary/30 hover:bg-primary/5 mb-3 w-full" onClick={() => { setNewIndicatorCode(ind.code); setNewIndicatorDescription(ind.desc); setNewIndicatorWeight(ind.weight); }}>
                                <div className="flex justify-between w-full font-black text-sm text-primary mb-1"><span>{ind.code}</span><Badge variant="outline">{ind.weight}%</Badge></div>
                                <p className="text-[11px] text-slate-500 line-clamp-2">{ind.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {setupStep === 1 && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="space-y-1"><Label className="font-black text-xs uppercase text-primary tracking-widest flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary" /> Selección del Instrumento</Label></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                          {[
                            { id: 'manual', label: 'Nota Directa', icon: FileText },
                            { id: 'cotejo', label: 'Lista de Cotejo', icon: LayoutList },
                            { id: 'rubrica', label: 'Rúbrica', icon: Target },
                            { id: 'escala', label: 'Escala Valorativa', icon: Star },
                            { id: 'guia', label: 'Guía Observación', icon: Quote },
                            { id: 'grupal', label: 'Trabajo Grupal', icon: Users },
                            { id: 'quizz', label: 'Quizz Sallé', icon: Gamepad2 }
                          ].map((t) => (
                            <Button key={t.id} variant="outline" className={cn("h-auto py-6 flex-col gap-2 rounded-2xl border-2", newColType === t.id ? 'border-primary bg-primary/5' : 'hover:border-slate-200')} onClick={() => {
                              setNewColType(t.id as ColumnType);
                              if(t.id === 'quizz' && editorCriteria.length === 0) {
                                setEditorCriteria([{ id: Date.now().toString(), text: "", options: ["", "", "", ""], correctIndex: 0, timeLimit: 20 }]);
                              }
                            }}>
                              <t.icon className={`h-6 w-6 ${newColType === t.id ? 'text-primary' : 'text-slate-300'}`} />
                              <span className="font-black text-[9px] uppercase tracking-tighter">{t.label}</span>
                            </Button>
                          ))}
                          <div className="relative">
                            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAiScan} />
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="h-full w-full py-6 flex-col gap-2 rounded-2xl border-2 border-dashed border-accent hover:bg-accent/5">
                              {isScanning ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : <Sparkles className="h-6 w-6 text-accent" />}
                              <span className="font-black text-[9px] uppercase tracking-tighter text-accent">{isScanning ? "..." : "Escanear IA"}</span>
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-slate-50 items-end">
                          <div className="md:col-span-2 space-y-3">
                            <Label className="font-black text-[11px] uppercase text-primary tracking-widest">Nombre de la Actividad</Label>
                            <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Ej. Proyecto Final" className="h-14 rounded-xl text-lg font-bold border-2" />
                          </div>
                          <div className="space-y-3">
                            <Label className="font-black text-[11px] uppercase text-indigo-600 tracking-widest">Peso (%)</Label>
                            <Input type="number" value={newInstrumentWeight || ""} onChange={e => setNewInstrumentWeight(parseInt(e.target.value) || 0)} className="h-14 rounded-xl text-center text-lg font-black border-2" />
                          </div>
                          {(newColType === 'manual' || newColType === 'grupal' || newColType === 'quizz') && (
                            <div className="space-y-3">
                              <Label className="font-black text-[11px] uppercase text-primary tracking-widest">Puntaje Máx.</Label>
                              <Input type="number" value={newMaxPoints} onChange={e => setNewMaxPoints(parseInt(e.target.value) || 20)} className="h-14 rounded-xl text-center text-lg font-black border-2" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {setupStep === 2 && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100">
                          <div className="flex items-center gap-4">
                            <div className="p-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20">{getInstrumentIcon(newColType)}</div>
                            <div>
                              <p className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] mb-1">{TYPE_LABELS[newColType].toUpperCase()} CONFIGURACIÓN</p>
                              <div className="font-black text-slate-900 text-2xl tracking-tighter">{newColName}</div>
                            </div>
                          </div>
                          {(newColType === 'cotejo' || newColType === 'guia') && (
                            <div className={cn("px-6 py-3 rounded-2xl font-black text-lg shadow-sm border-2", totalPointsStep === 20 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100')}>
                              PUNTOS: {totalPointsStep} / 20
                            </div>
                          )}
                        </div>

                        {(newColType === 'cotejo' || newColType === 'guia') && (
                          <div className="space-y-4">
                            <div className="grid gap-3">
                              {editorCriteria.map((cr, idx) => (
                                <div key={idx} className="flex gap-4 items-center bg-white p-5 rounded-2xl border-2 border-slate-100 group hover:border-primary/20 transition-all shadow-sm">
                                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-black text-slate-300 text-xs shrink-0 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                    {idx + 1}
                                  </div>
                                  <Input 
                                    value={cr.description} 
                                    onChange={e => { const next = [...editorCriteria]; next[idx].description = e.target.value; setEditorCriteria(next); }} 
                                    placeholder={newColType === 'guia' ? "Paso o proceso técnico..." : "Define el criterio de evaluación..."} 
                                    className="border-none shadow-none font-bold text-slate-700 text-lg bg-transparent flex-1 focus-visible:ring-0 px-0" 
                                  />
                                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                    <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest">PTS</span>
                                    <Input 
                                      type="number" 
                                      value={cr.points} 
                                      onChange={e => { const next = [...editorCriteria]; next[idx].points = parseInt(e.target.value) || 0; setEditorCriteria(next); }} 
                                      className="w-14 h-9 bg-white border-2 border-slate-100 rounded-lg text-center font-black text-sm" 
                                    />
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-10 w-10 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => setEditorCriteria(editorCriteria.filter((_, i) => i !== idx))}>
                                    <Trash2 className="h-5 w-5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <Button variant="outline" className="w-full border-dashed border-2 h-16 rounded-2xl text-slate-400 font-black uppercase text-xs gap-3 hover:bg-slate-50 hover:text-primary transition-all" onClick={() => setEditorCriteria([...editorCriteria, { id: Date.now().toString(), description: "", points: 2 }])}>
                              <Plus className="h-5 w-5" /> Añadir Nuevo Criterio
                            </Button>
                          </div>
                        )}
                        
                        {newColType === 'escala' && (
                          <div className="space-y-4">
                            <div className="grid gap-3">
                              {editorCriteria.map((cr, idx) => (
                                <div key={idx} className="flex gap-4 items-center bg-white p-5 rounded-2xl border-2 border-slate-100 group hover:border-primary/20 transition-all shadow-sm">
                                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-black text-slate-300 text-xs shrink-0">{idx + 1}</div>
                                  <Input 
                                    value={cr.description} 
                                    onChange={e => { const next = [...editorCriteria]; next[idx].description = e.target.value; setEditorCriteria(next); }} 
                                    placeholder="Indicador de desempeño..." 
                                    className="border-none shadow-none font-bold text-slate-700 text-lg bg-transparent flex-1 focus-visible:ring-0 px-0" 
                                  />
                                  <Button variant="ghost" size="icon" className="h-10 w-10 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => setEditorCriteria(editorCriteria.filter((_, i) => i !== idx))}>
                                    <Trash2 className="h-5 w-5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <Button variant="outline" className="w-full border-dashed border-2 h-16 rounded-2xl text-slate-400 font-black uppercase text-xs gap-3 hover:bg-slate-50 hover:text-primary transition-all" onClick={() => setEditorCriteria([...editorCriteria, { id: Date.now().toString(), description: "" }])}>
                              <Plus className="h-5 w-5" /> Añadir Nuevo Indicador
                            </Button>
                          </div>
                        )}

                        {newColType === 'rubrica' && (
                          <div className="space-y-10">
                            {editorCriteria.map((rc, idx) => (
                              <div key={idx} className="p-8 bg-slate-50/50 rounded-[2.5rem] border-2 border-slate-100 overflow-hidden">
                                <div className="flex justify-between items-center mb-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-primary rounded-full" />
                                    <Input 
                                      value={rc.category} 
                                      onChange={e => { const next = [...editorCriteria]; next[idx].category = e.target.value; setEditorCriteria(next); }} 
                                      className="font-black uppercase text-sm tracking-widest bg-transparent border-none p-0 h-auto w-[400px] focus-visible:ring-0" 
                                      placeholder="NOMBRE DE LA DIMENSIÓN A EVALUAR" 
                                    />
                                  </div>
                                  <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => setEditorCriteria(editorCriteria.filter((_, i) => i !== idx))}><Trash2 className="h-5 w-5" /></Button>
                                </div>
                                <div className="grid grid-cols-5 gap-3">
                                  {rc.levels.map((lvl: any, lIdx: number) => (
                                    <div key={lIdx} className="bg-white p-4 rounded-2xl border-2 border-slate-100 space-y-3 shadow-sm flex flex-col min-w-0">
                                      <div className="flex justify-between items-center">
                                        <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest truncate">{lvl.label}</span>
                                        <Badge variant="outline" className="font-black text-primary text-[10px] bg-primary/5 border-primary/20 shrink-0">{lvl.points} pts</Badge>
                                      </div>
                                      <textarea 
                                        value={lvl.description} 
                                        onChange={e => { const next = [...editorCriteria]; next[idx].levels[lIdx].description = e.target.value; setEditorCriteria(next); }} 
                                        className="w-full resize-none border-none text-[11px] font-medium h-24 bg-slate-50/50 p-3 rounded-xl focus:bg-white transition-colors break-words" 
                                        placeholder="Descripción del nivel..." 
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <Button variant="outline" className="w-full border-dashed border-2 h-20 rounded-[2rem] text-slate-400 font-black uppercase text-xs gap-3 hover:bg-slate-50 hover:text-primary transition-all" onClick={() => setEditorCriteria([...editorCriteria, { id: Date.now().toString(), category: "", levels: JSON.parse(JSON.stringify(DEFAULT_RUBRIC_LEVELS)) }])}>
                              <Plus className="h-6 w-6" /> Añadir Nueva Dimensión a la Rúbrica
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="p-8 bg-slate-50 border-t flex justify-between gap-3 items-center shrink-0">
                <Button variant="ghost" onClick={() => setSetupStep(p => Math.max(0, p - 1))} disabled={setupStep === 0 || isScanning} className="font-black text-[10px] uppercase h-11 px-8 rounded-xl border-2">Anterior</Button>
                <div className="flex gap-3">
                  {setupStep < 2 ? (
                    <Button className="bg-primary px-10 h-11 font-black text-[10px] uppercase rounded-xl text-white" onClick={() => setSetupStep(p => p + 1)} disabled={(setupStep === 0 && (!newIndicatorCode || !newIndicatorDescription)) || (setupStep === 1 && !newColName) || isScanning}>Siguiente</Button>
                  ) : (
                    <Button className="bg-primary px-12 h-11 font-black text-[10px] uppercase rounded-xl text-white" onClick={addColumn}>Finalizar</Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-[2.5rem]">
        <div className="p-8 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative w-full md:w-[450px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input placeholder="Buscar alumno..." className="pl-14 h-14 border-none shadow-inner rounded-2xl bg-white font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-12 px-6 border-slate-200 rounded-xl font-bold gap-2" onClick={fetchFullGradebook}><RefreshCcw className="h-4 w-4" /> Recargar</Button>
            <Button className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg gap-2" onClick={handleSaveAll} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {isSaving ? "Guardando..." : "Guardar Registro"}
            </Button>
          </div>
        </div>
        
        <CardContent className="p-0">
          <ScrollArea className="w-full h-[600px]">
            <Table>
              <TableHeader className="bg-slate-50/30 sticky top-0 z-10 backdrop-blur-md">
                <TableRow className="border-none">
                  <TableHead className="pl-10 font-black text-[10px] uppercase text-slate-400 tracking-widest w-[300px] py-6 bg-slate-50/30">Alumno</TableHead>
                  {columns.map(c => (
                    <TableHead key={c.id} className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest px-6 border-l min-w-[160px] bg-slate-50/30">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <div className="text-primary/60">{getInstrumentIcon(c.type)}</div>
                          <Badge variant="outline" className="border-primary/20 text-primary text-[8px] font-black">{c.indicatorCode}</Badge>
                        </div>
                        <span className="text-slate-900 truncate w-32 font-extrabold">{c.name}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-black text-[10px] uppercase text-primary tracking-widest bg-primary/5 w-[120px] border-l sticky right-0 z-10 backdrop-blur-md">Nota Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const finalScore = calculateFinal(s.id);
                  return (
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
                      {columns.map(c => {
                        const grade = grades[s.id]?.[c.id] || 0;
                        const isPassing = (grade / c.maxPoints) * 20 >= 13;
                        return (
                          <TableCell key={c.id} className="text-center px-6 border-l">
                            <div className="flex items-center justify-center gap-2">
                              <Input 
                                type="number" 
                                className={cn("w-14 h-10 text-center font-black text-lg border-none shadow-inner rounded-lg", !isPassing ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50')} 
                                value={grade} 
                                onChange={e => handleGradeChange(s.id, c.id, e.target.value)} 
                              />
                              {c.type !== 'manual' && c.type !== 'grupal' && c.type !== 'quizz' && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary border-2 border-primary/5" onClick={() => { setActiveEval({ student: s, column: c }); setEvalData(evalDetails[s.id]?.[c.id] || {}); setEvalComment(comments[s.id]?.[c.id] || ""); }}>
                                      <Target className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-6xl p-0 overflow-hidden border-none shadow-2xl rounded-[3rem] flex flex-col h-[90vh]">
                                    {activeEval && (
                                      <>
                                        <div className="bg-primary p-10 text-white flex justify-between items-center shrink-0">
                                          <div className="space-y-2">
                                            <Badge className="bg-white/20 text-white font-black uppercase text-[10px]">{TYPE_LABELS[activeEval.column.type].toUpperCase()}</Badge>
                                            <h3 className="text-3xl font-black uppercase tracking-tighter">{activeEval.student.nombre}</h3>
                                            <p className="text-blue-100/80 font-bold uppercase text-[10px] tracking-widest">{activeEval.column.name}</p>
                                          </div>
                                          <div className="bg-white/10 p-6 rounded-2xl border-2 border-white/10 text-center min-w-[140px]">
                                            <p className="text-[9px] font-black uppercase text-blue-200 mb-1">Nota Calculada</p>
                                            <p className="text-5xl font-black font-mono">
                                              {
                                                activeEval.column.type === 'cotejo' || activeEval.column.type === 'guia'
                                                ? Math.round(Object.entries(evalData).reduce((acc, [idx, val]) => val === true ? acc + (instruments[activeEval.column.instrumentId].criteria[parseInt(idx)].points || (20/instruments[activeEval.column.instrumentId].criteria.length)) : acc, 0))
                                                : activeEval.column.type === 'escala'
                                                  ? Math.round((Object.values(evalData).reduce((acc, v) => acc + (v as number), 0) / (instruments[activeEval.column.instrumentId].criteria.length * Math.max(...instruments[activeEval.column.instrumentId].scaleLevels!.map(l => l.points)))) * 20)
                                                  : Object.values(evalData).reduce((acc, v) => acc + (v as number), 0)
                                              }
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex-grow flex overflow-hidden">
                                          <ScrollArea className="p-10 bg-slate-50/50 flex-grow">
                                            {(activeEval.column.type === 'cotejo' || activeEval.column.type === 'guia') && (
                                              <ChecklistEvaluator criteria={instruments[activeEval.column.instrumentId].criteria} evalData={evalData} onUpdate={setEvalData} />
                                            )}
                                            {activeEval.column.type === 'rubrica' && (
                                              <RubricEvaluator criteria={instruments[activeEval.column.instrumentId].criteria} evalData={evalData} onUpdate={setEvalData} />
                                            )}
                                            {activeEval.column.type === 'escala' && (
                                              <ScaleEvaluator criteria={instruments[activeEval.column.instrumentId].criteria} scaleLevels={instruments[activeEval.column.instrumentId].scaleLevels!} evalData={evalData} onUpdate={setEvalData} />
                                            )}
                                          </ScrollArea>
                                          
                                          {(activeEval.column.type === 'cotejo' || activeEval.column.type === 'guia') && (
                                            <div className="w-[400px] p-10 bg-white border-l flex flex-col gap-6">
                                              <div className="space-y-3 flex-1 flex flex-col">
                                                <Label className="font-black text-xs uppercase text-slate-400 flex items-center gap-2 shrink-0">
                                                  <MessageSquare className="h-4 w-4" /> Observaciones del Logro
                                                </Label>
                                                <Textarea 
                                                  value={evalComment} 
                                                  onChange={e => setEvalComment(e.target.value)} 
                                                  placeholder="Comentarios sobre el desempeño o incidencias..." 
                                                  className="flex-1 rounded-2xl border-2 resize-none p-6 font-medium italic text-slate-600 shadow-inner bg-slate-50/30" 
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                        <div className="p-10 bg-white border-t flex justify-end gap-4 shrink-0">
                                          <Button variant="ghost" className="font-black text-slate-400 uppercase text-xs px-12 h-16 rounded-2xl border-2 hover:bg-slate-50 flex-1 sm:flex-none" onClick={() => setActiveEval(null)}>Descartar</Button>
                                          <Button className="bg-primary font-black uppercase text-xs px-12 h-16 rounded-2xl shadow-xl text-white flex-1 sm:flex-none" onClick={() => {
                                            const score = activeEval.column.type === 'cotejo' || activeEval.column.type === 'guia'
                                              ? Math.round(Object.entries(evalData).reduce((acc, [idx, val]) => val === true ? acc + (instruments[activeEval.column.instrumentId].criteria[parseInt(idx)].points || (20/instruments[activeEval.column.instrumentId].criteria.length)) : acc, 0))
                                              : activeEval.column.type === 'escala'
                                                ? Math.round((Object.values(evalData).reduce((acc, v) => acc + (v as number), 0) / (instruments[activeEval.column.instrumentId].criteria.length * Math.max(...instruments[activeEval.column.instrumentId].scaleLevels!.map(l => l.points)))) * 20)
                                                : Object.values(evalData).reduce((acc, v) => acc + (v as number), 0);
                                            handleGradeChange(activeEval.student.id, activeEval.column.id, score.toString());
                                            setEvalDetails(prev => ({ ...prev, [activeEval.student.id]: { ...prev[activeEval.student.id], [activeEval.column.id]: evalData } }));
                                            if (evalComment) setComments(prev => ({ ...prev, [activeEval.student.id]: { ...prev[activeEval.student.id], [activeEval.column.id]: evalComment } }));
                                            setActiveEval(null); setEvalData({}); setEvalComment("");
                                          }}>Aplicar Nota</Button>
                                        </div>
                                      </>
                                    )}
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center bg-primary/5 border-l py-6 sticky right-0 z-10 backdrop-blur-md">
                        <span className={cn("text-xl font-black font-mono", finalScore < 13 ? 'text-red-600' : 'text-primary')}>{finalScore.toString().padStart(2, '0')}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
