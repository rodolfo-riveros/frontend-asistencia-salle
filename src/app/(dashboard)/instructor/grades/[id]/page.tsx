
"use client"

import * as React from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Target, FileText, LayoutList, Star, Quote } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { getInitials, cn } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { analyzeInstrument } from "@/ai/flows/analyze-instrument-flow"

// Modular Components
import { GradebookHeader } from "@/components/grades/GradebookHeader"
import { GradebookToolbar } from "@/components/grades/GradebookToolbar"
import { ConfigWizard } from "@/components/grades/ConfigWizard"
import { EvaluationModal } from "@/components/grades/EvaluationModal"

type InstrumentType = 'manual' | 'cotejo' | 'rubrica' | 'escala' | 'guia'
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

const DEFAULT_SCALE_LEVELS = [
  { label: 'Excelente', points: 4 },
  { label: 'Bueno', points: 3 },
  { label: 'Regular', points: 2 },
  { label: 'Deficiente', points: 1 },
]

export default function AcademicGradebookPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const periodoId = searchParams.get('periodo_id') || "ACTUAL"
  
  const [students, setStudents] = React.useState<any[]>([])
  const [columns, setColumns] = React.useState<Column[]>([])
  const [instruments, setInstruments] = React.useState<Record<string, Instrument>>({})
  const [grades, setGrades] = React.useState<Record<string, Record<string, number>>>({})
  const [evalDetails, setEvalDetails] = React.useState<Record<string, Record<string, any>>>({})
  const [comments, setComments] = React.useState<Record<string, Record<string, string>>>({})
  
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  
  const [isNewColOpen, setIsNewColOpen] = React.useState(false)
  const [activeEval, setActiveEval] = React.useState<{ student: any, column: Column } | null>(null)
  const [evalData, setEvalData] = React.useState<Record<string, any>>({})
  const [evalComment, setEvalComment] = React.useState("")

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

  const [groupSize, setGroupSize] = React.useState(3)
  const [studentGroups, setStudentGroups] = React.useState<Record<string, string>>({})

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

      // Carga completa desde el nuevo endpoint de FastAPI
      const configData = await api.get<any>(`/evaluaciones/config/${params.id}/${periodoId}`)
      if (configData) {
        if (configData.columns) setColumns(configData.columns)
        if (configData.instruments) setInstruments(configData.instruments)
        if (configData.grades) setGrades(configData.grades)
        if (configData.details) setEvalDetails(configData.details)
        if (configData.comments) setComments(configData.comments)
      }
    } catch (err: any) {
      console.error("Error al cargar datos:", err)
      toast({ variant: "destructive", title: "Estado Inicial", description: "No se encontraron configuraciones previas." })
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
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      const analysis = await analyzeInstrument({ photoDataUri: base64 })
      if (!analysis) throw new Error("La IA no pudo interpretar el documento.")
      if (analysis.type) setNewInstType(analysis.type)
      if (analysis.name) setNewColName(analysis.name)
      if (analysis.suggestedWeight) setNewInstrumentWeight(analysis.suggestedWeight)
      if ((analysis.type === 'cotejo' || analysis.type === 'guia') && analysis.checklistCriteria) {
        setEditorCriteria(analysis.checklistCriteria.map((c: any) => ({ id: Math.random().toString(), ...c })))
      } else if (analysis.type === 'rubrica' && analysis.rubricDimensions) {
        setEditorCriteria(analysis.rubricDimensions.map((d: any) => ({ id: Math.random().toString(), ...d })))
      } else if (analysis.type === 'escala' && analysis.checklistCriteria) {
        setEditorCriteria(analysis.checklistCriteria.map((c: any) => ({ id: Math.random().toString(), description: c.description })))
      }
      setSetupStep(3) 
      toast({ title: "Digitalización Exitosa" })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setIsScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = "" 
    }
  }

  const addColumn = () => {
    fetchFullGradebook() // Recargar todo desde el backend después de una nueva configuración
  }

  const resetEditor = () => {
    setSetupStep(0); setNewIndicatorCode(""); setNewIndicatorDescription(""); setNewIndicatorWeight(0)
    setNewInstrumentWeight(0); setNewColName(""); setNewInstType('manual'); setNewStrategyType('individual')
    setNewMaxPoints(20); setEditorCriteria([]); setStudentGroups({})
  }

  const handleGradeChange = async (studentId: string, columnId: string, value: string) => {
    const column = columns.find(c => c.id === columnId)
    const max = column?.maxPoints || 20
    const numValue = Math.min(max, Math.max(0, parseFloat(value) || 0))
    
    // Actualización optimista en UI
    setGrades(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [columnId]: numValue }
    }))

    // Persistencia en FastAPI
    try {
      await api.post('/evaluaciones/calificar/', {
        evaluacion_id: columnId,
        alumno_id: studentId,
        puntaje: numValue,
        observacion: comments[studentId]?.[columnId] || "",
        detalles_json: evalDetails[studentId]?.[columnId] || null
      })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al calificar", description: "No se pudo guardar la nota en el servidor." })
    }
  }

  const calculateFinal = (studentId: string) => {
    const studentGrades = grades[studentId] || {}
    if (columns.length === 0) return 0
    const indicatorsMap = new Map<string, { weight: number, cols: Column[] }>()
    columns.forEach(c => {
      if (!indicatorsMap.has(c.indicatorCode)) indicatorsMap.set(c.indicatorCode, { weight: c.indicatorWeight, cols: [] })
      indicatorsMap.get(c.indicatorCode)!.cols.push(c)
    })
    let finalSum = 0
    let totalIndicatorWeight = 0
    indicatorsMap.forEach((data) => {
      const { cols, weight } = data
      let weightedSum = 0
      let weightFactor = 0
      cols.forEach(c => {
        const rawScore = studentGrades[c.id] || 0
        const normalized = (rawScore / c.maxPoints) * 20
        weightedSum += normalized * (c.instrumentWeight / 100)
        weightFactor += (c.instrumentWeight / 100)
      })
      const indicatorAvg = weightFactor > 0 ? weightedSum / weightFactor : 0
      finalSum += indicatorAvg * (weight / 100)
      totalIndicatorWeight += (weight / 100)
    })
    return Math.round(totalIndicatorWeight > 0 ? finalSum / totalIndicatorWeight : finalSum)
  }

  const getInstrumentIcon = (type: InstrumentType) => {
    switch (type) {
      case 'cotejo': return <LayoutList className="h-3 w-3" />;
      case 'rubrica': return <Target className="h-3 w-3" />;
      case 'escala': return <Star className="h-3 w-3" />;
      case 'guia': return <Quote className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  }

  const filtered = students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6 md:space-y-10 pb-20">
      <GradebookHeader onNewEval={() => setIsNewColOpen(true)} />

      <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-2xl md:rounded-[2.5rem]">
        <GradebookToolbar 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
          onReload={fetchFullGradebook} 
          onSave={() => { setIsSaving(true); setTimeout(() => setIsSaving(false), 1000); }} 
          isSaving={isSaving} 
        />
        
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow className="border-none">
                  <TableHead className="pl-6 md:pl-10 font-black text-[10px] uppercase text-slate-400 tracking-widest w-[200px] md:w-[300px] py-4 md:py-6 sticky left-0 z-20 bg-slate-50/90 backdrop-blur-sm border-r">Alumno</TableHead>
                  {columns.map(c => (
                    <TableHead key={c.id} className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest px-4 md:px-6 border-l min-w-[150px] md:min-w-[180px]">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <div className="text-primary/60">{getInstrumentIcon(c.type)}</div>
                          <Badge variant="outline" className="border-primary/20 text-primary text-[8px] font-black">{c.indicatorCode}</Badge>
                        </div>
                        <span className="text-slate-900 truncate w-32 md:w-36 font-extrabold">{c.name}</span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-black text-[10px] uppercase text-primary tracking-widest bg-primary/5 w-[100px] md:w-[120px] border-l sticky right-0 z-20 bg-primary/5 backdrop-blur-sm">Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const finalScore = calculateFinal(s.id);
                  return (
                    <TableRow key={s.id} className="hover:bg-slate-50/50 transition-all group border-b">
                      <TableCell className="pl-6 md:pl-10 py-4 md:py-6 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 border-r">
                        <div className="flex items-center gap-3 md:gap-4">
                          <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-white shadow-sm">
                            <AvatarFallback className="bg-primary/5 text-primary font-black text-[10px] md:text-xs">{getInitials(s.nombre)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-xs md:text-sm text-slate-800 uppercase truncate w-32 md:w-48">{s.nombre}</span>
                            <span className="text-[8px] md:text-[9px] text-slate-400 font-mono">DNI: {s.dni}</span>
                          </div>
                        </div>
                      </TableCell>
                      {columns.map(c => (
                        <TableCell key={c.id} className="text-center px-4 md:px-6 border-l">
                          <div className="flex items-center justify-center gap-2">
                            <Input 
                              type="number" 
                              className={cn("w-12 md:w-14 h-9 md:h-10 text-center font-black text-base md:text-lg border-none shadow-inner rounded-lg", (grades[s.id]?.[c.id] || 0) < 13 ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50')} 
                              value={grades[s.id]?.[c.id] || 0} 
                              onChange={e => handleGradeChange(s.id, c.id, e.target.value)} 
                            />
                            {c.type !== 'manual' && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl hover:bg-primary/10 text-primary border-2 border-primary/5" onClick={() => { setActiveEval({ student: s, column: c }); setEvalData(evalDetails[s.id]?.[c.id] || {}); setEvalComment(comments[s.id]?.[c.id] || ""); }}>
                                <Target className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-center bg-primary/5 border-l py-4 md:py-6 sticky right-0 z-10 group-hover:bg-primary/10 backdrop-blur-sm">
                        <span className={cn("text-lg md:text-xl font-black font-mono", finalScore < 13 ? 'text-red-600' : 'text-primary')}>{finalScore.toString().padStart(2, '0')}</span>
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
        isOpen={isNewColOpen} setIsOpen={setIsNewColOpen}
        unidadId={params.id as string} periodoId={periodoId}
        setupStep={setupStep} setSetupStep={setSetupStep}
        newIndicatorCode={newIndicatorCode} setNewIndicatorCode={setNewIndicatorCode}
        newIndicatorDescription={newIndicatorDescription} setNewIndicatorDescription={setNewIndicatorDescription}
        newIndicatorWeight={newIndicatorWeight} setNewIndicatorWeight={setNewIndicatorWeight}
        existingIndicators={existingIndicators}
        newInstType={newInstType} setNewInstType={setNewInstType}
        newStrategyType={newStrategyType} setNewStrategyType={setNewStrategyType}
        newColName={newColName} setNewColName={setNewColName}
        newInstrumentWeight={newInstrumentWeight} setNewInstrumentWeight={setNewInstrumentWeight}
        newMaxPoints={newMaxPoints} setNewMaxPoints={setNewMaxPoints}
        editorCriteria={editorCriteria} setEditorCriteria={setEditorCriteria}
        isScanning={isScanning} fileInputRef={fileInputRef} handleAiScan={handleAiScan}
        totalPointsStep={totalPointsStep} students={students}
        groupSize={groupSize} setGroupSize={setGroupSize}
        studentGroups={studentGroups} setStudentGroups={setStudentGroups}
        addColumn={addColumn} resetEditor={resetEditor}
      />

      <EvaluationModal 
        activeEval={activeEval} onClose={() => setActiveEval(null)}
        evalData={evalData} setEvalData={setEvalData}
        evalComment={evalComment} setEvalComment={setEvalComment}
        instruments={instruments} handleGradeChange={handleGradeChange}
        setEvalDetails={setEvalDetails} setComments={setComments}
      />
    </div>
  )
}
