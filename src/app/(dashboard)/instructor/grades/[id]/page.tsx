
"use client"

import * as React from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Target, FileText, LayoutList, Star, Quote, Loader2, Gamepad2, Play } from "lucide-react"
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

type InstrumentType = 'manual' | 'cotejo' | 'rubrica' | 'escala' | 'anecdotario' | 'quizz'
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

function GradebookContent() {
  const params = useParams()
  const router = useRouter()
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
    if (newInstType !== 'cotejo' && newInstType !== 'anecdotario') return 0
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

        const mappedCols: Column[] = configData.evaluaciones.map((ev: any) => {
          const groupMap: Record<string, string> = {};
          const evalGroups = configData.grupos?.filter((g: any) => g.evaluacion_id === ev.id) || [];
          evalGroups.forEach((g: any) => {
            g.integrantes?.forEach((studentId: string) => {
              groupMap[studentId] = g.nombre_grupo;
            });
          });

          return {
            id: ev.id,
            name: ev.nombre,
            indicatorId: ev.indicador_id,
            indicatorCode: ev.indicador_codigo || "N/A",
            indicatorDescription: ev.indicador_desc || "",
            indicatorWeight: ev.indicador_peso || 0,
            instrumentWeight: ev.peso_instrumento || 0,
            type: ev.tipo as InstrumentType,
            strategy: ev.configuracion_json?.strategy || 'individual',
            instrumentId: ev.id,
            maxPoints: ev.puntaje_maximo || 20,
            groups: groupMap
          };
        });

        const sortedCols = [...mappedCols].sort((a, b) => 
          a.indicatorCode.localeCompare(b.indicatorCode, undefined, { numeric: true, sensitivity: 'base' })
        );
        setColumns(sortedCols);

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

        sortedCols.forEach(col => {
          if (col.strategy === 'grupal' && col.groups) {
            const groupGrades: Record<string, { grade: number, detail: any, comment: string }> = {};
            
            Object.entries(col.groups).forEach(([sId, gName]) => {
              if (gradesMap[sId]?.[col.id] !== undefined && !groupGrades[gName]) {
                groupGrades[gName] = {
                  grade: gradesMap[sId][col.id],
                  detail: detailsMap[sId]?.[col.id],
                  comment: commentsMap[sId]?.[col.id] || ""
                };
              }
            });

            Object.entries(col.groups).forEach(([sId, gName]) => {
              if (groupGrades[gName]) {
                if (!gradesMap[sId]) gradesMap[sId] = {};
                gradesMap[sId][col.id] = groupGrades[gName].grade;
                
                if (groupGrades[gName].detail) {
                  if (!detailsMap[sId]) detailsMap[sId] = {};
                  detailsMap[sId][col.id] = groupGrades[gName].detail;
                }
                
                if (groupGrades[gName].comment) {
                  if (!commentsMap[sId]) commentsMap[sId] = {};
                  commentsMap[sId][col.id] = groupGrades[gName].comment;
                }
              }
            });
          }
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
    if (!column) return
    const max = column.maxPoints || 20
    
    const targetStudentIds = [studentId];
    if (column.strategy === 'grupal' && column.groups) {
      const groupName = column.groups[studentId];
      if (groupName) {
        Object.entries(column.groups).forEach(([id, name]) => {
          if (name === groupName && id !== studentId) {
            targetStudentIds.push(id);
          }
        });
      }
    }

    if (value === "") {
       setGrades(prev => {
         const next = { ...prev };
         targetStudentIds.forEach(id => {
           if (next[id]) {
             const studentGrades = { ...next[id] };
             delete studentGrades[columnId];
             next[id] = studentGrades;
           }
         });
         return next;
       });
       return;
    }

    const numValue = Math.min(max, Math.max(0, parseFloat(value)));
    if (isNaN(numValue)) return;
    
    setGrades(prev => {
      const next = { ...prev };
      targetStudentIds.forEach(id => {
        next[id] = { ...(next[id] || {}), [columnId]: numValue };
      });
      return next;
    });

    if (overrideDetails) {
      setEvalDetails(prev => {
        const next = { ...prev };
        targetStudentIds.forEach(id => {
          next[id] = { ...(next[id] || {}), [columnId]: overrideDetails };
        });
        return next;
      });
    }

    if (overrideComment !== undefined) {
      setComments(prev => {
        const next = { ...prev };
        targetStudentIds.forEach(id => {
          next[id] = { ...(next[id] || {}), [columnId]: overrideComment };
        });
        return next;
      });
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
        const rawScore = studentGrades[c.id]
        if (rawScore !== undefined) {
          const normalized = (rawScore / c.maxPoints) * 20
          weightedSum += normalized * (c.instrumentWeight / 100)
          weightFactor += (c.instrumentWeight / 100)
        }
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
      case 'anecdotario': return <Quote className="h-3 w-3" />;
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
        />
        
        <CardContent className="p-0 overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-x-auto">
                <Table className="relative border-collapse">
                  <TableHeader className="bg-slate-50/30">
                    <TableRow className="border-none">
                      <TableHead className="pl-6 md:pl-10 font-black text-[10px] uppercase text-slate-400 tracking-widest w-[250px] md:w-[350px] py-4 md:py-6 sticky left-0 z-30 bg-slate-50 backdrop-blur-sm border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        Alumno
                      </TableHead>
                      {columns.map(c => (
                        <TableHead key={c.id} className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest px-4 md:px-6 border-l min-w-[120px] md:min-w-[140px]">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center justify-center gap-1">
                              <div className="text-primary/60">{getInstrumentIcon(c.type)}</div>
                              <Badge variant="outline" className="border-primary/20 text-primary text-[8px] font-black px-1.5">{c.indicatorCode}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-900 truncate w-24 md:w-32 font-extrabold text-[11px]">{c.name}</span>
                              {c.strategy === 'quizz' && (
                                <button 
                                  onClick={() => router.push(`/instructor/quiz/${c.id}`)}
                                  className="h-6 w-6 rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                >
                                  <Play className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center font-black text-[10px] uppercase text-primary tracking-widest w-[100px] md:w-[120px] border-l sticky right-0 z-30 bg-primary/5 backdrop-blur-sm shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">
                        Promedio
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length > 0 ? (
                      filtered.map((s) => {
                        const finalScore = calculateFinal(s.id);
                        return (
                          <TableRow key={s.id} className="hover:bg-slate-50/50 transition-all group border-b">
                            <TableCell className="pl-6 md:pl-10 py-4 md:py-6 sticky left-0 z-20 bg-white group-hover:bg-slate-50/50 border-r shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                              <div className="flex items-center gap-3 md:gap-4">
                                <Avatar className="h-8 w-8 md:h-9 md:w-9 border-2 border-white shadow-sm">
                                  <AvatarFallback className="bg-primary/5 text-primary font-black text-[10px] md:text-xs">{getInitials(s.nombre)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="font-bold text-xs text-slate-800 uppercase truncate w-32 md:w-48">{s.nombre}</span>
                                  <span className="text-[8px] md:text-[9px] text-slate-400 font-mono">DNI: {s.dni}</span>
                                </div>
                              </div>
                            </TableCell>
                            {columns.map(c => {
                              const gradeValue = grades[s.id]?.[c.id];
                              return (
                                <TableCell key={c.id} className="text-center px-2 md:px-4 border-l">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Input 
                                      type="number" 
                                      placeholder="-"
                                      className={cn(
                                        "w-12 h-8 md:h-9 text-center font-bold text-xs md:text-sm border-none shadow-inner rounded-lg p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:ring-1 focus-visible:ring-primary/20", 
                                        (gradeValue !== undefined && gradeValue < 13) ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50',
                                        gradeValue === undefined && 'bg-slate-50 text-slate-300'
                                      )} 
                                      value={gradeValue === undefined ? "" : gradeValue} 
                                      onChange={e => handleGradeChange(s.id, c.id, e.target.value)} 
                                    />
                                    {(c.type !== 'manual' && c.type !== 'quizz') && (
                                      <button 
                                        className="h-7 w-7 md:h-8 md:w-8 rounded-lg hover:bg-primary/10 text-primary border-2 border-primary/5 shrink-0 flex items-center justify-center transition-colors" 
                                        onClick={() => { 
                                          setActiveEval({ student: s, column: c }); 
                                          setEvalData(evalDetails[s.id]?.[c.id] || {}); 
                                          setEvalComment(comments[s.id]?.[c.id] || ""); 
                                        }}
                                      >
                                        <Target className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center bg-primary/5 border-l py-4 md:py-6 sticky right-0 z-20 group-hover:bg-primary/10 backdrop-blur-sm shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">
                              <span className={cn("text-base md:text-lg font-black font-mono", finalScore < 13 ? 'text-red-600' : 'text-primary')}>{finalScore.toString().padStart(2, '0')}</span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length + 2} className="h-64 text-center text-slate-400 font-black uppercase text-xs tracking-widest">
                          No se encontraron estudiantes
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
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
        fileInputRef={fileInputRef} 
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

export default function AcademicGradebookPage() {
  return (
    <React.Suspense fallback={<div className="h-screen flex flex-col items-center justify-center gap-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="font-black uppercase text-xs tracking-widest text-slate-400">Sincronizando Registro Auxiliar...</p></div>}>
      <GradebookContent />
    </React.Suspense>
  )
}
