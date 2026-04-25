
"use client"

import * as React from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Target, FileText, LayoutList, Star, Quote, Loader2, Gamepad2, Play, RefreshCcw } from "lucide-react"
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
import { supabase } from "@/lib/supabase"
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  const [error, setError] = React.useState<string | null>(null)
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
  
  const [courseInfo, setCourseInfo] = React.useState<any>(null)
  const [userName, setUserName] = React.useState("")
  const [isExporting, setIsExporting] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const fetchFullGradebook = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [studentData, configData, userData, periodData, assignmentsData, allProgs] = await Promise.all([
        api.get<any[]>(`/me/unidades/${params.id}/alumnos`),
        api.get<any>(`/evaluaciones/config/${params.id}/${periodoId}`),
        supabase.auth.getUser(),
        api.get<any[]>('/periodos/'),
        api.get<any[]>(`/me/asignaciones/?periodo_id=${periodoId}`),
        api.get<any[]>('/programas/')
      ]);

      setStudents(studentData)
      if (userData.data.user?.user_metadata) {
        setUserName(`${userData.data.user.user_metadata.firstname || ""} ${userData.data.user.user_metadata.lastname || ""}`.trim().toUpperCase());
      }

      const periodObj = periodData.find((p: any) => p.id === periodoId);
      const currentAsg = Array.isArray(assignmentsData) ? assignmentsData.find((asg: any) => asg.unidad_id === params.id) : null;
      const progObj = allProgs.find((p: any) => p.id === currentAsg?.programa_id);

      setCourseInfo({
        nombre: currentAsg?.unidad_nombre || configData?.unidad?.nombre || "UNIDAD NO IDENTIFICADA",
        programa: progObj?.nombre || currentAsg?.programa_nombre || "PROGRAMA NO DEFINIDO",
        semestre: currentAsg?.semestre || "I",
        periodoNombre: periodObj ? periodObj.nombre : (configData?.periodo?.nombre || "ACTUAL")
      });

      if (configData) {
        setIndicators(configData.indicadores || []);

        const mappedCols: Column[] = (configData.evaluaciones || []).map((ev: any) => {
          const groupMap: Record<string, string> = {};
          const evalGroups = configData.grupos?.filter((g: any) => g.evaluacion_id === ev.id) || [];
          evalGroups.forEach((g: any) => {
            // FIX: integrantes puede ser un array de objetos con alumno_id
            g.integrantes?.forEach((integrante: any) => {
              const sid = typeof integrante === 'string' ? integrante : (integrante.alumno_id || integrante.id);
              if (sid) groupMap[sid] = g.nombre_grupo;
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
        (configData.evaluaciones || []).forEach((ev: any) => {
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

        (configData.calificaciones || []).forEach((cal: any) => {
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
      setError(err.message || "Error de base de datos");
    } finally {
      setIsLoading(false)
    }
  }, [params.id, periodoId])

  React.useEffect(() => { fetchFullGradebook() }, [fetchFullGradebook])

  const calculateFinal = (studentId: string) => {
    const studentGrades = grades[studentId] || {}
    if (columns.length === 0) return 0
    
    const indicatorsMap = new Map<string, { weight: number, cols: Column[] }>()
    columns.forEach(c => {
      if (!indicatorsMap.has(c.indicatorCode)) {
        indicatorsMap.set(c.indicatorCode, { weight: c.indicatorWeight, cols: [] })
      }
      indicatorsMap.get(c.indicatorCode)!.cols.push(c)
    })

    let finalSum = 0
    let totalWeightsUsed = 0

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
      totalWeightsUsed += (weight / 100)
    })

    const finalResult = totalWeightsUsed > 0 ? finalSum / totalWeightsUsed : finalSum
    return Math.round(finalResult)
  }

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
    
    // Identificar IDs de destino (si es grupal, incluir a los compañeros)
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
    
    // Actualizar estado local para todos los alumnos del grupo
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

    // Persistencia masiva en DB
    try {
      const promises = targetStudentIds.map(id => 
        api.post('/evaluaciones/calificar/', {
          evaluacion_id: columnId,
          alumno_id: id,
          puntaje: numValue,
          observacion: overrideComment ?? (comments[id]?.[columnId] || ""),
          detalles_json: overrideDetails ?? (evalDetails[id]?.[columnId] || null)
        })
      );
      await Promise.all(promises);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al calificar", description: "No se pudo sincronizar la nota grupal." })
    }
  }

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const rows: any[] = [];
      rows.push(["INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA"]);
      rows.push(["REGISTRO AUXILIAR DE CALIFICACIONES"]);
      rows.push([]);
      rows.push(["UNIDAD DIDÁCTICA:", (courseInfo?.nombre || "N/A").toUpperCase(), "", "CICLO:", courseInfo?.periodoNombre || "N/A"]);
      rows.push(["PROGRAMA:", (courseInfo?.programa || "N/A").toUpperCase(), "", "SEMESTRE:", courseInfo?.semestre || "N/A"]);
      rows.push(["DOCENTE:", userName, "", "FECHA EMISIÓN:", new Date().toLocaleDateString()]);
      rows.push([]);
      
      const head = ["N°", "APELLIDOS Y NOMBRES", "DNI"];
      columns.forEach(c => head.push(`${c.indicatorCode}`));
      head.push("PROMEDIO FINAL");
      rows.push(head);

      students.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach((s, i) => {
        const row = [
          (i + 1).toString().padStart(2, '0'),
          s.nombre.toUpperCase(),
          s.dni
        ];
        columns.forEach(c => {
          const v = grades[s.id]?.[c.id];
          row.push(v !== undefined ? v.toString() : "-");
        });
        row.push(calculateFinal(s.id).toString());
        rows.push(row);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Calificaciones");
      XLSX.writeFile(wb, `REGISTRO_${(courseInfo?.nombre || 'UD').replace(/\s+/g, '_')}.xlsx`);
    } catch (e) {
      toast({ variant: "destructive", title: "Error Excel" });
    } finally {
      setIsExporting(false);
    }
  }

  const handleExportPdf = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(16); doc.setTextColor(0, 51, 102); doc.setFont("helvetica", "bold");
      doc.text("INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA", 14, 15);
      
      doc.setFontSize(9); doc.setTextColor(100); doc.text("REGISTRO AUXILIAR DE CALIFICACIONES ACADÉMICAS", 14, 22);
      
      doc.setFontSize(8); doc.setTextColor(0); doc.setFont("helvetica", "normal");
      doc.text("UNIDAD DIDÁCTICA:", 14, 30); doc.setFont("helvetica", "bold"); doc.text(`${(courseInfo?.nombre || "N/A").toUpperCase()}`, 45, 30);
      doc.setFont("helvetica", "normal"); doc.text("PROGRAMA PROFESIONAL:", 14, 35); doc.setFont("helvetica", "bold"); doc.text(`${(courseInfo?.programa || "N/A").toUpperCase()}`, 55, 35);
      doc.setFont("helvetica", "normal"); doc.text("DOCENTE RESPONSABLE:", 14, 40); doc.setFont("helvetica", "bold"); doc.text(`${userName}`, 55, 40);
      
      doc.setFont("helvetica", "normal"); doc.text("CICLO ACADÉMICO:", 230, 30); doc.setFont("helvetica", "bold"); doc.text(`${courseInfo?.periodoNombre || "N/A"}`, 265, 30);
      doc.setFont("helvetica", "normal"); doc.text("SEMESTRE:", 230, 35); doc.setFont("helvetica", "bold"); doc.text(`${courseInfo?.semestre || "N/A"}`, 255, 35);
      doc.setFont("helvetica", "normal"); doc.text("FECHA EMISIÓN:", 230, 40); doc.setFont("helvetica", "bold"); doc.text(`${new Date().toLocaleDateString()}`, 260, 40);

      const head = ["N°", "APELLIDOS Y NOMBRES", ...columns.map(c => c.indicatorCode), "PROMEDIO"];
      const body = students.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((s, i) => [
        (i + 1).toString().padStart(2, '0'),
        s.nombre.toUpperCase(),
        ...columns.map(c => grades[s.id]?.[c.id]?.toString() || "-"),
        calculateFinal(s.id).toString().padStart(2, '0')
      ]);

      autoTable(doc, {
        startY: 48,
        head: [head],
        body: body,
        theme: 'grid',
        styles: { fontSize: 7, halign: 'center' },
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        columnStyles: { 1: { halign: 'left', fontStyle: 'bold', cellWidth: 70 } }
      });

      doc.save(`REGISTRO_${(courseInfo?.nombre || 'UD').replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      toast({ variant: "destructive", title: "Error PDF" });
    } finally {
      setIsExporting(false);
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

  if (error && students.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 p-10 text-center">
        <div className="p-6 bg-red-50 rounded-full text-red-500 shadow-inner">
          <RefreshCcw className="h-12 w-12" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-900 uppercase">Fallo de Conexión</h3>
          <p className="text-slate-400 font-medium max-w-md">No se pudo recuperar la información del servidor. Esto puede deberse a saturación de recursos temporales.</p>
        </div>
        <Button onClick={fetchFullGradebook} className="bg-primary px-10 h-14 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-3">
          <RefreshCcw className="h-5 w-5" /> REINTENTAR SINCRONIZACIÓN
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-20">
      <GradebookHeader 
        onNewEval={() => setIsNewColOpen(true)} 
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
      />

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
                              <Badge variant="outline" className="border-primary/20 text-primary text-[8px] font-black px-1.5">{c.indicatorCode}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-900 truncate w-24 md:w-32 font-extrabold text-[11px]">{c.name}</span>
                              {c.strategy === 'quizz' && (
                                <button 
                                  onClick={() => router.push(`/instructor/quiz/${c.id}?periodo_id=${periodoId}&unidad_id=${params.id}`)}
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
        students={students}
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
