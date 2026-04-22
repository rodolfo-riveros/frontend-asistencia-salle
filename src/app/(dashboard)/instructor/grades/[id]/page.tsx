"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, Search, Save, Target, ChevronRight, ClipboardCheck, LayoutList, 
  FileText, Trash2, PlusCircle, BookOpen, Sparkles, Loader2, 
  MessageSquare, Star, Quote, History, FileSpreadsheet, RefreshCcw, 
  Users, Gamepad2, Play, Plus, User, CheckCircle2
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
  DialogDescription,
  DialogTrigger,
  DialogTitle
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { getInitials, cn } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { analyzeInstrument } from "@/ai/flows/analyze-instrument-flow"

// Componentes Modulares de Evaluación
import { ChecklistEvaluator } from "@/components/grades/ChecklistEvaluator"
import { RubricEvaluator } from "@/components/grades/RubricEvaluator"
import { ScaleEvaluator } from "@/components/grades/ScaleEvaluator"
import { GuideEvaluator } from "@/components/grades/GuideEvaluator"

// Componentes Modulares de Configuración (Editor)
import { RubricConfig } from "@/components/grades/editor/RubricConfig"
import { ChecklistConfig } from "@/components/grades/editor/ChecklistConfig"
import { ScaleConfig } from "@/components/grades/editor/ScaleConfig"
import { GuideConfig } from "@/components/grades/editor/GuideConfig"
import { GroupConfig } from "@/components/grades/strategies/GroupConfig"

type InstrumentType = 'manual' | 'cotejo' | 'rubrica' | 'escala' | 'guia' | 'objetiva'
type StrategyType = 'individual' | 'grupal' | 'quizz'

interface Instrument {
  id: string
  name: string
  type: InstrumentType
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
  type: InstrumentType
  strategy: StrategyType
  instrumentId: string
  maxPoints: number
  groups?: Record<string, string> 
}

const INST_LABELS: Record<string, string> = {
  manual: 'Nota Directa',
  cotejo: 'Lista de Cotejo',
  rubrica: 'Rúbrica',
  escala: 'Escala Valorativa',
  guia: 'Guía Observación',
  objetiva: 'Prueba Objetiva'
}

const STRAT_LABELS: Record<string, string> = {
  individual: 'Individual',
  grupal: 'Trabajo Grupal',
  quizz: 'Gamificación'
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
  const [newInstType, setNewInstType] = React.useState<InstrumentType>('manual')
  const [newStrategyType, setNewStrategyType] = React.useState<StrategyType>('individual')
  const [newColName, setNewColName] = React.useState("")
  const [newMaxPoints, setNewMaxPoints] = React.useState(20)
  const [editorCriteria, setEditorCriteria] = React.useState<any[]>([])
  const [editorScaleLevels, setEditorScaleLevels] = React.useState<any[]>(DEFAULT_SCALE_LEVELS)

  // Groups Logic
  const [groupSize, setGroupSize] = React.useState(3)
  const [studentGroups, setStudentGroups] = React.useState<Record<string, string>>({})

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
    if (newInstType !== 'cotejo' && newInstType !== 'guia') return 0
    return editorCriteria.reduce((acc, curr) => acc + (Number(curr.points) || 0), 0)
  }, [editorCriteria, newInstType])

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
          studentData.forEach(s => { initialGrades[s.id] = {} })
          setGrades(initialGrades)
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
      setNewInstType(analysis.type)
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
    if ((newInstType === 'cotejo' || newInstType === 'guia') && totalPointsStep !== 20) {
      toast({ variant: "destructive", title: "Puntaje Inválido", description: "La suma de los criterios debe ser exactamente 20." })
      return
    }

    const colId = `col-${Date.now()}`
    const instId = `inst-${Date.now()}`
    const existingInd = existingIndicators.find(ind => ind.code === newIndicatorCode)

    const newInstrument: Instrument = {
      id: instId,
      name: newColName,
      type: newInstType,
      criteria: editorCriteria,
      scaleLevels: newInstType === 'escala' ? editorScaleLevels : undefined,
      maxPoints: (newInstType === 'manual' || newInstType === 'objetiva') ? newMaxPoints : 20
    }

    const newColumn: Column = {
      id: colId,
      name: newColName,
      indicatorId: existingInd?.id,
      indicatorCode: newIndicatorCode,
      indicatorDescription: newIndicatorDescription,
      indicatorWeight: newIndicatorWeight,
      instrumentWeight: newInstrumentWeight,
      type: newInstType,
      strategy: newStrategyType,
      instrumentId: instId,
      maxPoints: (newInstType === 'manual' || newInstType === 'objetiva') ? newMaxPoints : 20,
      groups: newStrategyType === 'grupal' ? studentGroups : undefined
    }

    setInstruments(prev => ({ ...prev, [instId]: newInstrument }))
    setColumns(prev => [...prev, newColumn])
    setGrades(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(sid => { if(!next[sid]) next[sid] = {}; next[sid][colId] = 0 })
      return next
    })

    setIsNewColOpen(false)
    resetEditor()
    toast({ title: "Evaluación Agregada" })
  }

  const resetEditor = () => {
    setSetupStep(0); setNewIndicatorCode(""); setNewIndicatorDescription(""); setNewIndicatorWeight(0)
    setNewInstrumentWeight(0); setNewColName(""); setNewInstType('manual'); setNewStrategyType('individual')
    setNewMaxPoints(20); setEditorCriteria([]); setStudentGroups({}); setEditorScaleLevels(DEFAULT_SCALE_LEVELS)
  }

  const handleGradeChange = (studentId: string, columnId: string, value: string) => {
    const column = columns.find(c => c.id === columnId)
    const max = column?.maxPoints || 20
    const numValue = Math.min(max, Math.max(0, parseInt(value) || 0))
    
    setGrades(prev => {
      const next = { ...prev }
      if (!next[studentId]) next[studentId] = {}
      if (column?.strategy === 'grupal' && column.groups?.[studentId]) {
        const studentGroup = column.groups[studentId]
        students.forEach(s => {
          if (column.groups?.[s.id] === studentGroup) {
            if (!next[s.id]) next[s.id] = {}
            next[s.id][columnId] = numValue
          }
        })
      } else {
        next[studentId][columnId] = numValue
      }
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
    const weightedAverages: number[] = []; const indicatorWeights: number[] = []
    indicatorsMap.forEach((data) => {
      const { cols, weight } = data
      let indicatorAvg = 0; const totalInstrumentWeight = cols.reduce((sum, c) => sum + c.instrumentWeight, 0)
      if (totalInstrumentWeight > 0) {
        let weightedSum = 0; let weightFactor = 0
        cols.forEach(c => {
          const rawScore = studentGrades[c.id] || 0; const normalized = (rawScore / c.maxPoints) * 20
          weightedSum += normalized * (c.instrumentWeight / 100); weightFactor += (c.instrumentWeight / 100)
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
    }
    const finalSum = weightedAverages.reduce((s, a) => s + a, 0)
    return Math.round(finalSum / (weightedAverages.length || 1))
  }

  const getInstrumentIcon = (type: InstrumentType) => {
    switch (type) {
      case 'cotejo': return <LayoutList className="h-3 w-3" />;
      case 'rubrica': return <Target className="h-3 w-3" />;
      case 'escala': return <Star className="h-3 w-3" />;
      case 'guia': return <Quote className="h-3 w-3" />;
      case 'objetiva': return <ClipboardCheck className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  }

  const filtered = students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-8 pb-20">
      <HeaderSection router={router} setIsNewColOpen={setIsNewColOpen} />

      <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-[2.5rem]">
        <TableToolbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} fetchFullGradebook={fetchFullGradebook} isSaving={isSaving} handleSaveAll={() => { setIsSaving(true); setTimeout(() => { setIsSaving(false); toast({ title: "Sincronizado" }); }, 1000); }} />
        
        <CardContent className="p-0">
          <ScrollArea className="w-full h-[600px]">
            <Table>
              <TableHeader className="bg-slate-50/30 sticky top-0 z-10 backdrop-blur-md">
                <TableRow className="border-none">
                  <TableHead className="pl-10 font-black text-[10px] uppercase text-slate-400 tracking-widest w-[300px] py-6 bg-slate-50/30">Alumno</TableHead>
                  {columns.map(c => (
                    <TableHead key={c.id} className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest px-6 border-l min-w-[180px] bg-slate-50/30">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <div className="text-primary/60">{getInstrumentIcon(c.type)}</div>
                          <Badge variant="outline" className="border-primary/20 text-primary text-[8px] font-black">{c.indicatorCode}</Badge>
                          {c.strategy !== 'individual' && <Badge className={cn("text-[8px] font-black uppercase", c.strategy === 'grupal' ? 'bg-indigo-600' : 'bg-yellow-500')}>{c.strategy === 'grupal' ? 'GP' : 'QZ'}</Badge>}
                        </div>
                        <span className="text-slate-900 truncate w-36 font-extrabold">{c.name}</span>
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
                        <StudentCell student={s} columns={columns} />
                      </TableCell>
                      {columns.map(c => (
                        <GradeCell 
                          key={c.id} 
                          studentId={s.id} 
                          column={c} 
                          grade={grades[s.id]?.[c.id] || 0} 
                          handleGradeChange={handleGradeChange} 
                          onEvaluate={() => { 
                            setActiveEval({ student: s, column: c }); 
                            setEvalData(evalDetails[s.id]?.[c.id] || {}); 
                            setEvalComment(comments[s.id]?.[c.id] || ""); 
                          }} 
                        />
                      ))}
                      <TableCell className="text-center bg-primary/5 border-l py-6 sticky right-0 z-10 backdrop-blur-md">
                        <span className={cn("text-xl font-black font-mono", finalScore < 13 ? 'text-red-600' : 'text-primary')}>{finalScore.toString().padStart(2, '0')}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <ConfigWizard 
        isOpen={isNewColOpen} 
        setIsOpen={setIsNewColOpen}
        setupStep={setupStep}
        setSetupStep={setSetupStep}
        newIndicatorCode={newIndicatorCode}
        setNewIndicatorCode={setNewIndicatorCode}
        newIndicatorDescription={newIndicatorDescription}
        setNewIndicatorDescription={setNewIndicatorDescription}
        newIndicatorWeight={newIndicatorWeight}
        setNewIndicatorWeight={setNewIndicatorWeight}
        existingIndicators={existingIndicators}
        newInstType={newInstType}
        setNewInstType={setNewInstType}
        newStrategyType={newStrategyType}
        setNewStrategyType={setNewStrategyType}
        newColName={newColName}
        setNewColName={setNewColName}
        newInstrumentWeight={newInstrumentWeight}
        setNewInstrumentWeight={setNewInstrumentWeight}
        newMaxPoints={newMaxPoints}
        setNewMaxPoints={setNewMaxPoints}
        editorCriteria={editorCriteria}
        setEditorCriteria={setEditorCriteria}
        isScanning={isScanning}
        fileInputRef={fileInputRef}
        handleAiScan={handleAiScan}
        totalPointsStep={totalPointsStep}
        students={students}
        groupSize={groupSize}
        setGroupSize={setGroupSize}
        studentGroups={studentGroups}
        setStudentGroups={setStudentGroups}
        addColumn={addColumn}
        resetEditor={resetEditor}
        getInstrumentIcon={getInstrumentIcon}
      />

      <EvaluationModal 
        activeEval={activeEval}
        setActiveEval={setActiveEval}
        evalData={evalData}
        setEvalData={setEvalData}
        evalComment={evalComment}
        setEvalComment={setEvalComment}
        instruments={instruments}
        handleGradeChange={handleGradeChange}
        setEvalDetails={setEvalDetails}
        setComments={setComments}
      />
    </div>
  )
}

function HeaderSection({ router, setIsNewColOpen }: any) {
  return (
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
        <Button variant="outline" className="h-14 px-6 gap-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-black rounded-2xl uppercase text-[11px] tracking-widest"><FileSpreadsheet className="h-5 w-5" /> Excel</Button>
        <Button variant="outline" className="h-14 px-6 gap-3 border-red-200 text-red-700 hover:bg-red-50 font-black rounded-2xl uppercase text-[11px] tracking-widest"><FileText className="h-5 w-5" /> PDF</Button>
        <Button className="h-14 px-8 gap-3 bg-primary hover:bg-primary/90 font-black shadow-xl shadow-primary/30 rounded-2xl uppercase text-[11px] tracking-widest text-white" onClick={() => setIsNewColOpen(true)}><PlusCircle className="h-5 w-5" /> Nueva Evaluación</Button>
      </div>
    </div>
  )
}

function TableToolbar({ searchTerm, setSearchTerm, fetchFullGradebook, isSaving, handleSaveAll }: any) {
  return (
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
  )
}

function StudentCell({ student, columns }: any) {
  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
        <AvatarFallback className="bg-primary/5 text-primary font-black text-xs">{getInitials(student.nombre)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="font-bold text-sm text-slate-800 uppercase truncate w-48">{student.nombre}</span>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] text-slate-400 font-mono">DNI: {student.dni}</span>
          {columns.some((c: any) => c.strategy === 'grupal' && c.groups?.[student.id]) && (
            <Badge variant="outline" className="h-4 px-1.5 text-[8px] font-black border-indigo-100 text-indigo-400 uppercase">
              {columns.find((c: any) => c.strategy === 'grupal' && c.groups?.[student.id])?.groups?.[student.id]}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

function GradeCell({ studentId, column, grade, handleGradeChange, onEvaluate }: any) {
  const isPassing = (grade / column.maxPoints) * 20 >= 13;
  return (
    <TableCell className="text-center px-6 border-l">
      <div className="flex items-center justify-center gap-2">
        <Input 
          type="number" 
          className={cn("w-14 h-10 text-center font-black text-lg border-none shadow-inner rounded-lg", !isPassing ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50')} 
          value={grade} 
          onChange={e => handleGradeChange(studentId, column.id, e.target.value)} 
        />
        {column.type !== 'manual' && column.type !== 'objetiva' && (
          <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary border-2 border-primary/5" onClick={onEvaluate}>
            <Target className="h-4 w-4" />
          </Button>
        )}
        {column.strategy === 'quizz' && (
          <Button size="icon" variant="outline" className="h-10 w-10 rounded-xl border-yellow-500/20 text-yellow-600 hover:bg-yellow-50 shadow-sm">
            <Play className="h-4 w-4" />
          </Button>
        )}
      </div>
    </TableCell>
  )
}

function ConfigWizard({ 
  isOpen, setIsOpen, setupStep, setSetupStep, newIndicatorCode, setNewIndicatorCode,
  newIndicatorDescription, setNewIndicatorDescription, newIndicatorWeight, setNewIndicatorWeight,
  existingIndicators, newInstType, setNewInstType, newStrategyType, setNewStrategyType,
  newColName, setNewColName, newInstrumentWeight, setNewInstrumentWeight, newMaxPoints, setNewMaxPoints,
  editorCriteria, setEditorCriteria, isScanning, fileInputRef, handleAiScan, totalPointsStep,
  students, groupSize, setGroupSize, studentGroups, setStudentGroups, addColumn, resetEditor, getInstrumentIcon
}: any) {
  return (
    <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if(!o) resetEditor(); }}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col h-[90vh]">
        <div className="bg-primary p-8 text-white shrink-0">
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">Configuración Técnica</DialogTitle>
          <DialogDescription className="text-blue-100/80 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Establece los criterios de evaluación</DialogDescription>
        </div>

        <div className="flex-grow overflow-hidden flex flex-col">
          <ScrollArea className="flex-grow">
            <div className="p-10 bg-white min-h-full">
              {setupStep === 0 && (
                <IndicatorStep newIndicatorCode={newIndicatorCode} setNewIndicatorCode={setNewIndicatorCode} newIndicatorWeight={newIndicatorWeight} setNewIndicatorWeight={setNewIndicatorWeight} newIndicatorDescription={newIndicatorDescription} setNewIndicatorDescription={setNewIndicatorDescription} existingIndicators={existingIndicators} />
              )}
              {setupStep === 1 && (
                <SelectionStep newInstType={newInstType} setNewInstType={setNewInstType} newStrategyType={newStrategyType} setNewStrategyType={setNewStrategyType} newColName={newColName} setNewColName={setNewColName} newInstrumentWeight={newInstrumentWeight} setNewInstrumentWeight={setNewInstrumentWeight} newMaxPoints={newMaxPoints} setNewMaxPoints={setNewMaxPoints} isScanning={isScanning} fileInputRef={fileInputRef} handleAiScan={handleAiScan} />
              )}
              {setupStep === 2 && (
                <DetailedConfigStep newInstType={newInstType} newStrategyType={newStrategyType} newColName={newColName} totalPointsStep={totalPointsStep} students={students} groupSize={groupSize} setGroupSize={setGroupSize} studentGroups={studentGroups} setStudentGroups={setStudentGroups} editorCriteria={editorCriteria} setEditorCriteria={setEditorCriteria} getInstrumentIcon={getInstrumentIcon} />
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="p-8 bg-slate-50 border-t flex justify-between gap-3 items-center shrink-0">
          <Button variant="ghost" onClick={() => setSetupStep(Math.max(0, setupStep - 1))} disabled={setupStep === 0 || isScanning} className="font-black text-[10px] uppercase h-11 px-8 rounded-xl border-2">Anterior</Button>
          <div className="flex gap-3">
            {setupStep < 2 ? (
              <Button className="bg-primary px-10 h-11 font-black text-[10px] uppercase rounded-xl text-white" onClick={() => setSetupStep(setupStep + 1)} disabled={(setupStep === 0 && (!newIndicatorCode || !newIndicatorDescription)) || (setupStep === 1 && !newColName) || isScanning}>Siguiente</Button>
            ) : (
              <Button className="bg-primary px-12 h-11 font-black text-[10px] uppercase rounded-xl text-white" onClick={addColumn}>Finalizar y Crear</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function IndicatorStep({ newIndicatorCode, setNewIndicatorCode, newIndicatorWeight, setNewIndicatorWeight, newIndicatorDescription, setNewIndicatorDescription, existingIndicators }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><BookOpen className="h-6 w-6" /></div>
          <div className="flex flex-col"><h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Indicador de Logro</h4><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Fundamentación</p></div>
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
          {existingIndicators.map((ind: any, i: number) => (
            <button key={i} className="flex flex-col items-start p-4 rounded-2xl border-2 border-slate-50 hover:border-primary/30 hover:bg-primary/5 mb-3 w-full" onClick={() => { setNewIndicatorCode(ind.code); setNewIndicatorDescription(ind.desc); setNewIndicatorWeight(ind.weight); }}>
              <div className="flex justify-between w-full font-black text-sm text-primary mb-1"><span>{ind.code}</span><Badge variant="outline">{ind.weight}%</Badge></div>
              <p className="text-[11px] text-slate-500 line-clamp-2">{ind.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SelectionStep({ newInstType, setNewInstType, newStrategyType, setNewStrategyType, newColName, setNewColName, newInstrumentWeight, setNewInstrumentWeight, newMaxPoints, setNewMaxPoints, isScanning, fileInputRef, handleAiScan }: any) {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4">
      <div className="space-y-8">
        <div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-primary" /><h4 className="font-black text-xs uppercase text-primary tracking-widest">Selección del Instrumento (El Cómo)</h4></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { id: 'manual', label: 'Nota Directa', icon: FileText },
            { id: 'cotejo', label: 'Lista de Cotejo', icon: LayoutList },
            { id: 'rubrica', label: 'Rúbrica', icon: Target },
            { id: 'escala', label: 'Escala Valorativa', icon: Star },
            { id: 'guia', label: 'Guía Observación', icon: Quote },
            { id: 'objetiva', label: 'Prueba Objetiva', icon: ClipboardCheck }
          ].map((t) => (
            <Button key={t.id} variant="outline" className={cn("h-auto py-6 flex-col gap-3 rounded-2xl border-2 transition-all", newInstType === t.id ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5' : 'hover:border-slate-200')} onClick={() => setNewInstType(t.id as any)}>
              <t.icon className={`h-7 w-7 ${newInstType === t.id ? 'text-primary' : 'text-slate-300'}`} />
              <span className="font-black text-[9px] uppercase tracking-tighter text-center">{t.label}</span>
            </Button>
          ))}
          <div className="relative">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAiScan} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="h-full w-full py-6 flex-col gap-3 rounded-2xl border-2 border-dashed border-accent hover:bg-accent/5">
              {isScanning ? <Loader2 className="h-7 w-7 animate-spin text-accent" /> : <Sparkles className="h-7 w-7 text-accent" />}
              <span className="font-black text-[9px] uppercase tracking-tighter text-accent">{isScanning ? "..." : "Escanear IA"}</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-8 pt-10 border-t border-slate-50">
        <div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-indigo-500" /><h4 className="font-black text-xs uppercase text-indigo-600 tracking-widest">Modalidad de Trabajo / Estrategia (El Qué)</h4></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'individual', label: 'Actividad Individual', icon: User, desc: 'Evaluación personalizada por alumno.' },
            { id: 'grupal', label: 'Trabajo en Equipo', icon: Users, desc: 'Califica a uno y replica al grupo.' },
            { id: 'quizz', label: 'Gamificación Sallé', icon: Gamepad2, desc: 'Lanza una sala interactiva en vivo.' }
          ].map((s) => (
            <Button key={s.id} variant="outline" className={cn("h-auto p-6 flex-col gap-3 rounded-[2rem] border-2 text-left items-start transition-all", newStrategyType === s.id ? 'border-indigo-600 bg-indigo-50/30' : 'hover:border-slate-200')} onClick={() => setNewStrategyType(s.id as any)}>
              <div className="flex justify-between items-center w-full"><s.icon className={`h-8 w-8 ${newStrategyType === s.id ? 'text-indigo-600' : 'text-slate-300'}`} />{newStrategyType === s.id && <CheckCircle2 className="h-5 w-5 text-indigo-600" />}</div>
              <div className="space-y-1"><p className="font-black text-[11px] uppercase tracking-tighter">{s.label}</p><p className="text-[10px] text-slate-400 leading-tight font-medium">{s.desc}</p></div>
            </Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-slate-50 items-end">
        <div className="md:col-span-2 space-y-3"><Label className="font-black text-[11px] uppercase text-primary tracking-widest">Nombre de la Actividad</Label><Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Ej. Exposición de Proyectos" className="h-14 rounded-xl text-lg font-bold border-2" /></div>
        <div className="space-y-3"><Label className="font-black text-[11px] uppercase text-indigo-600 tracking-widest">Peso Instrumento (%)</Label><Input type="number" value={newInstrumentWeight || ""} onChange={e => setNewInstrumentWeight(parseInt(e.target.value) || 0)} className="h-14 rounded-xl text-center text-lg font-black border-2" /></div>
        {(newInstType === 'manual' || newInstType === 'objetiva') && <div className="space-y-3"><Label className="font-black text-[11px] uppercase text-primary tracking-widest">Puntaje Máx.</Label><Input type="number" value={newMaxPoints} onChange={e => setNewMaxPoints(parseInt(e.target.value) || 20)} className="h-14 rounded-xl text-center text-lg font-black border-2" /></div>}
      </div>
    </div>
  )
}

function DetailedConfigStep({ newInstType, newStrategyType, newColName, totalPointsStep, students, groupSize, setGroupSize, studentGroups, setStudentGroups, editorCriteria, setEditorCriteria, getInstrumentIcon }: any) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
      <div className="flex justify-between items-center bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-primary text-white rounded-3xl shadow-xl shadow-primary/20">{getInstrumentIcon(newInstType)}</div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Badge variant="outline" className="font-black text-[8px] uppercase tracking-widest border-primary/20 text-primary">{INST_LABELS[newInstType].toUpperCase()}</Badge>
              <Badge className="font-black text-[8px] uppercase tracking-widest bg-indigo-600">{STRAT_LABELS[newStrategyType].toUpperCase()}</Badge>
            </div>
            <div className="font-black text-slate-900 text-3xl tracking-tighter">{newColName}</div>
          </div>
        </div>
        {(newInstType === 'cotejo' || newInstType === 'guia') && <div className={cn("px-8 py-4 rounded-2xl font-black text-xl shadow-inner border-2", totalPointsStep === 20 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100')}>TOTAL: {totalPointsStep} / 20</div>}
      </div>
      {newStrategyType === 'grupal' && <GroupConfig students={students} groupSize={groupSize} setGroupSize={setGroupSize} studentGroups={studentGroups} setStudentGroups={setStudentGroups} />}
      {newInstType === 'cotejo' && <ChecklistConfig criteria={editorCriteria} setCriteria={setEditorCriteria} />}
      {newInstType === 'rubrica' && <RubricConfig criteria={editorCriteria} setCriteria={setEditorCriteria} />}
      {newInstType === 'escala' && <ScaleConfig criteria={editorCriteria} setCriteria={setEditorCriteria} />}
      {newInstType === 'guia' && <GuideConfig criteria={editorCriteria} setCriteria={setEditorCriteria} />}
    </div>
  )
}

function EvaluationModal({ activeEval, setActiveEval, evalData, setEvalData, evalComment, setEvalComment, instruments, handleGradeChange, setEvalDetails, setComments }: any) {
  if (!activeEval) return null;
  const column = activeEval.column;
  const student = activeEval.student;
  const instrument = instruments[column.instrumentId];

  const calculateScore = () => {
    if (column.type === 'cotejo' || column.type === 'guia') {
      return Math.round(Object.entries(evalData).reduce((acc, [idx, val]) => val === true ? acc + (instrument.criteria[parseInt(idx)].points || (20/instrument.criteria.length)) : acc, 0));
    }
    if (column.type === 'escala') {
      const maxPts = Math.max(...instrument.scaleLevels!.map((l: any) => l.points));
      const totalPossible = instrument.criteria.length * maxPts;
      const obtained = Object.values(evalData).reduce((acc, v) => acc + (v as number), 0);
      return Math.round((obtained / totalPossible) * 20);
    }
    return Object.values(evalData).reduce((acc, v) => acc + (v as number), 0);
  };

  const handleApply = () => {
    const score = calculateScore();
    handleGradeChange(student.id, column.id, score.toString());
    setEvalDetails((prev: any) => ({ ...prev, [student.id]: { ...prev[student.id], [column.id]: evalData } }));
    if (evalComment) setComments((prev: any) => ({ ...prev, [student.id]: { ...prev[student.id], [column.id]: evalComment } }));
    setActiveEval(null); setEvalData({}); setEvalComment("");
  };

  return (
    <Dialog open={!!activeEval} onOpenChange={(o) => { if(!o) setActiveEval(null); }}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden border-none shadow-2xl rounded-[3rem] flex flex-col h-[90vh]">
        <div className="bg-primary p-10 text-white flex justify-between items-center shrink-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white font-black uppercase text-[10px]">{INST_LABELS[column.type].toUpperCase()}</Badge>
              <Badge className="bg-indigo-600/50 text-white font-black uppercase text-[10px]">{STRAT_LABELS[column.strategy].toUpperCase()}</Badge>
            </div>
            <h3 className="text-3xl font-black uppercase tracking-tighter">{student.nombre} {column.strategy === 'grupal' && <span className="text-blue-300 ml-4">[{column.groups?.[student.id]}]</span>}</h3>
            <p className="text-blue-100/80 font-bold uppercase text-[10px] tracking-widest">{column.name}</p>
          </div>
          <div className="bg-white/10 p-6 rounded-2xl border-2 border-white/10 text-center min-w-[140px]">
            <p className="text-[9px] font-black uppercase text-blue-200 mb-1">Nota Calculada</p>
            <p className="text-5xl font-black font-mono">{calculateScore()}</p>
          </div>
        </div>
        <div className="flex-grow flex overflow-hidden">
          <ScrollArea className="p-10 bg-slate-50/50 flex-grow">
            {column.type === 'cotejo' && <ChecklistEvaluator criteria={instrument.criteria} evalData={evalData} onUpdate={setEvalData} />}
            {column.type === 'rubrica' && <RubricEvaluator criteria={instrument.criteria} evalData={evalData} onUpdate={setEvalData} />}
            {column.type === 'escala' && <ScaleEvaluator criteria={instrument.criteria} scaleLevels={instrument.scaleLevels!} evalData={evalData} onUpdate={setEvalData} />}
            {column.type === 'guia' && <GuideEvaluator criteria={instrument.criteria} evalData={evalData} onUpdate={setEvalData} />}
          </ScrollArea>
          {(column.type === 'cotejo' || column.type === 'guia') && (
            <div className="w-[400px] p-10 bg-white border-l flex flex-col gap-6">
              <div className="space-y-3 flex-1 flex flex-col">
                <Label className="font-black text-xs uppercase text-slate-400 flex items-center gap-2 shrink-0"><MessageSquare className="h-4 w-4" /> Observaciones del Logro</Label>
                <Textarea value={evalComment} onChange={e => setEvalComment(e.target.value)} placeholder="Comentarios..." className="flex-1 rounded-2xl border-2 resize-none p-6 font-medium italic text-slate-600 shadow-inner bg-slate-50/30" />
              </div>
            </div>
          )}
        </div>
        <div className="p-10 bg-white border-t flex justify-end gap-4 shrink-0">
          <Button variant="ghost" className="font-black text-slate-400 uppercase text-xs px-12 h-16 rounded-2xl border-2 hover:bg-slate-50" onClick={() => setActiveEval(null)}>Descartar</Button>
          <Button className="bg-primary font-black uppercase text-xs px-12 h-16 rounded-2xl shadow-xl text-white" onClick={handleApply}>Aplicar Nota {column.strategy === 'grupal' ? 'al Grupo' : ''}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
