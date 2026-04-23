
"use client"

import * as React from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Target, FileText, LayoutList, Star, Quote, Loader2, Gamepad2 } from "lucide-react"
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

// Modular Components
import { GradebookHeader } from "@/components/grades/GradebookHeader"
import { GradebookToolbar } from "@/components/grades/GradebookToolbar"
import { ConfigWizard } from "@/components/grades/ConfigWizard"
import { EvaluationModal } from "@/components/grades/EvaluationModal"

type InstrumentType = 'manual' | 'cotejo' | 'rubrica' | 'escala' | 'guia' | 'quizz'
type StrategyType = 'individual' | 'grupal' | 'quizz'

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
  const [indicators, setIndicators] = React.useState<any[]>([])
  const [columns, setColumns] = React.useState<Column[]>([])
  const [instruments, setInstruments] = React.useState<Record<string, any>>({})
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

  const [groupSize, setGroupSize] = React.useState(3)
  const [studentGroups, setStudentGroups] = React.useState<Record<string, string>>({})

  const [isScanning, setIsScanning] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const totalPointsStep = React.useMemo(() => {
    if (newInstType !== 'cotejo' && newInstType !== 'guia') return 0
    return editorCriteria.reduce((acc, curr) => acc + (Number(curr.points) || 0), 0)
  }, [editorCriteria, newInstType])

  const fetchFullGradebook = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const [studentData, configData] = await Promise.all([
        api.get<any[]>(`/me/unidades/${params.id}/alumnos`),
        api.get<any>(`/evaluaciones/config/${params.id}/${periodoId}`)
      ]);

      setStudents(studentData)

      if (configData) {
        setIndicators(configData.indicadores || []);

        const mappedCols: Column[] = configData.evaluaciones.map((ev: any) => ({
          id: ev.id,
          name: ev.nombre,
          indicatorId: ev.indicador_id,
          indicatorCode: ev.indicador_codigo,
          indicatorDescription: ev.indicador_desc,
          indicatorWeight: ev.indicador_peso,
          instrumentWeight: ev.peso_instrumento,
          type: ev.tipo as InstrumentType,
          strategy: ev.configuracion_json?.strategy || 'individual',
          instrumentId: ev.id,
          maxPoints: ev.puntaje_maximo
        }));
        setColumns(mappedCols);

        const instMap: Record<string, any> = {};
        configData.evaluaciones.forEach((ev: any) => {
          instMap[ev.id] = {
            id: ev.id,
            name: ev.nombre,
            type: ev.tipo,
            criteria: ev.configuracion_json?.criteria || [],
            scaleLevels: DEFAULT_SCALE_LEVELS
          }
        });
        setInstruments(instMap);

        const gradesMap: Record<string, Record<string, number>> = {};
        const detailsMap: Record<string, Record<string, any>> = {};
        const commentsMap: Record<string, Record<string, string>> = {};

        configData.calificaciones?.forEach((cal: any) => {
          if (!gradesMap[cal.alumno_id]) gradesMap[cal.alumno_id] = {};
          gradesMap[cal.alumno_id][cal.evaluacion_id] = cal.puntaje;

          if (!detailsMap[cal.alumno_id]) detailsMap[cal.alumno_id] = {};
          detailsMap[cal.alumno_id][cal.evaluacion_id] = cal.detalles_json;

          if (!commentsMap[cal.alumno_id]) commentsMap[cal.alumno_id] = {};
          commentsMap[cal.alumno_id][cal.evaluacion_id] = cal.observacion;
        });

        setGrades(gradesMap);
        setEvalDetails(detailsMap);
        setComments(commentsMap);
      }
    } catch (err: any) {
      console.error("Error al cargar datos:", err)
      toast({ variant: "destructive", title: "Estado Inicial", description: "No se pudieron sincronizar las notas del servidor." })
    } finally {
      setIsLoading(false)
    }
  }, [params.id, periodoId])

  React.useEffect(() => { fetchFullGradebook() }, [fetchFullGradebook])

  const handleGradeChange = async (
    studentId: string, 
    columnId: string, 
    value: string,
    overrideDetails?: any,
    overrideComment?: string
  ) => {
    const column = columns.find(c => c.id === columnId)
    const max = column?.maxPoints || 20
    const numValue = Math.min(max, Math.max(0, parseFloat(value) || 0))
    
    // Actualizar estados locales inmediatamente
    setGrades(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [columnId]: numValue }
    }))

    if (overrideDetails) {
      setEvalDetails(prev => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), [columnId]: overrideDetails }
      }))
    }

    if (overrideComment !== undefined) {
      setComments(prev => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), [columnId]: overrideComment }
      }))
    }

    try {
      await api.post('/evaluaciones/calificar/', {
        evaluacion_id: columnId,
        alumno_id: studentId,
        puntaje: numValue,
        observacion: overrideComment ?? (comments[studentId]?.[columnId] || ""),
        detalles_json: overrideDetails ?? (evalDetails[studentId]?.[columnId] || null)
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
      case 'quizz': return <Gamepad2 className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  }

  const filtered = students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  if (isLoading && students.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-black uppercase text-xs tracking-widest text-slate-400">Sincronizando Registro Auxiliar...</p>
      </div>
    )
  }

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
                            {(c.type !== 'manual' && c.type !== 'quizz') && (
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
        existingIndicators={indicators}
        newInstType={newInstType} setNewInstType={setNewInstType}
        newStrategyType={newStrategyType} setNewStrategyType={setNewStrategyType}
        newColName={newColName} setNewColName={setNewColName}
        newInstrumentWeight={newInstrumentWeight} setNewInstrumentWeight={setNewInstrumentWeight}
        newMaxPoints={newMaxPoints} setNewMaxPoints={setNewMaxPoints}
        editorCriteria={editorCriteria} setEditorCriteria={setEditorCriteria}
        isScanning={isScanning} fileInputRef={fileInputRef} 
        totalPointsStep={totalPointsStep} students={students}
        groupSize={groupSize} setGroupSize={setGroupSize}
        studentGroups={studentGroups} setStudentGroups={setStudentGroups}
        addColumn={fetchFullGradebook} resetEditor={() => {
          setSetupStep(0); setNewIndicatorCode(""); setNewIndicatorDescription(""); setNewIndicatorWeight(0)
          setNewInstrumentWeight(0); setNewColName(""); setNewInstType('manual'); setNewStrategyType('individual')
          setNewMaxPoints(20); setEditorCriteria([]); setStudentGroups({})
        }}
      />

      <EvaluationModal 
        activeEval={activeEval} onClose={() => setActiveEval(null)}
        evalData={evalData} setEvalData={setEvalData}
        evalComment={evalComment} setEvalComment={setEvalComment}
        instruments={instruments} 
        handleGradeChange={handleGradeChange}
      />
    </div>
  )
}
