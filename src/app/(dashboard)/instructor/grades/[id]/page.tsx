"use client"

import * as React from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Target, FileText, LayoutList, Star, Quote, Loader2, Gamepad2, Play, RefreshCcw, Users, Sparkles } from "lucide-react"
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
import { aiAcademicInsights, type AcademicInsightsInput, type AcademicInsightsOutput } from "@/ai/flows/ai-academic-insights"

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
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)

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
        periodoNombre: periodObj ? periodObj.nombre : (configData?.periodo?.nombre || "ACTUAL"),
        seccion: currentAsg?.seccion || "U"
      });

      if (configData) {
        setIndicators(configData.indicadores || []);

        const mappedCols: Column[] = (configData.evaluaciones || []).map((ev: any) => {
          const groupMap: Record<string, string> = {};
          const evalGroups = configData.grupos?.filter((g: any) => g.evaluacion_id === ev.id) || [];
          evalGroups.forEach((g: any) => {
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
          gradesMap[cal.alumno_id][cal.evaluacion_id] = parseFloat(cal.puntaje) || 0;

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
      console.error("[GRADEBOOK ERROR]", err)
      setError(err.message || "Error de sincronización de datos");
    } finally {
      setIsLoading(false)
    }
  }, [params.id, periodoId])

  React.useEffect(() => { fetchFullGradebook() }, [fetchFullGradebook])

  const isRecovery = courseInfo?.seccion === 'REC'

  const calculateFinal = (studentId: string) => {
    const studentGrades = grades[studentId] || {}
    if (columns.length === 0) return 0

    if (isRecovery) {
      let weightedSum = 0
      let weightFactor = 0
      columns.forEach(c => {
        const rawScore = studentGrades[c.id]
        if (rawScore !== undefined) {
          const normalized = (rawScore / c.maxPoints) * 20
          weightedSum += normalized * (c.instrumentWeight / 100)
          weightFactor += (c.instrumentWeight / 100)
        }
      })
      return weightFactor > 0 ? Math.round(weightedSum / weightFactor) : 0
    }
    
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
      const promises = targetStudentIds.map(id => 
        api.post('/evaluaciones/calificar/', {
          evaluacion_id: columnId,
          alumno_id: id,
          puntaje: parseFloat(numValue.toFixed(2)),
          observacion: overrideComment ?? (comments[id]?.[columnId] || ""),
          detalles_json: overrideDetails ?? (evalDetails[id]?.[columnId] || null)
        })
      );
      await Promise.all(promises);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de Sincronización", description: "No se pudo guardar la nota." })
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
      
      doc.setFontSize(9); doc.setTextColor(100); doc.setFont("helvetica", "bold");
      doc.text("REGISTRO AUXILIAR DE CALIFICACIONES ACADÉMICAS", 14, 22);
      
      doc.setFontSize(8); doc.setTextColor(0); doc.setFont("helvetica", "normal");
      doc.text("UNIDAD DIDÁCTICA:", 14, 30); doc.setFont("helvetica", "bold");
      doc.text(`${(courseInfo?.nombre || "N/A").toUpperCase()}`, 45, 30);
      
      doc.setFont("helvetica", "normal");
      doc.text("PROGRAMA PROFESIONAL:", 14, 35); doc.setFont("helvetica", "bold");
      doc.text(`${(courseInfo?.programa || "N/A").toUpperCase()}`, 55, 35);
      
      doc.setFont("helvetica", "normal");
      doc.text("DOCENTE RESPONSABLE:", 14, 40); doc.setFont("helvetica", "bold");
      doc.text(`${userName}`, 55, 40);
      
      doc.setFont("helvetica", "normal");
      doc.text("SEMESTRE ACADÉMICO:", 230, 30); doc.setFont("helvetica", "bold");
      doc.text(`${courseInfo?.semestre || "N/A"}`, 270, 30);
      
      doc.setFont("helvetica", "normal");
      doc.text("FECHA DE EMISIÓN:", 230, 35); doc.setFont("helvetica", "bold");
      doc.text(`${new Date().toLocaleDateString()}`, 265, 35);

      const head = ["N°", "APELLIDOS Y NOMBRES", ...columns.map(c => c.indicatorCode), "PROMEDIO"];
      const body = students.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((s, i) => [
        (i + 1).toString().padStart(2, '0'),
        s.nombre.toUpperCase(),
        ...columns.map(c => grades[s.id]?.[c.id]?.toString() || "-"),
        calculateFinal(s.id).toString().padStart(2, '0')
      ]);

      autoTable(doc, {
        startY: 48, head: [head], body: body, theme: 'grid',
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

  const runAcademicAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const studentData: AcademicInsightsInput['students'] = students.map((s: any) => ({
        studentId: s.id,
        studentName: s.nombre,
        evaluations: columns.map(c => ({
          evalName: c.name,
          indicatorCode: c.indicatorCode,
          score: grades[s.id]?.[c.id] ?? 0,
          maxPoints: c.maxPoints,
          weight: c.instrumentWeight,
        })),
        finalGrade: calculateFinal(s.id),
      }))

      const result = await aiAcademicInsights({
        courseName: courseInfo?.nombre || "Unidad Didáctica",
        programName: courseInfo?.programa || "",
        semester: `${courseInfo?.semestre || ""} - ${courseInfo?.periodoNombre || ""}`,
        passingGrade: 13,
        students: studentData,
      })

      generateAcademicDiagnosticPdf(result, courseInfo, userName)
      toast({ title: "Diagnóstico Académico Listo", description: "El PDF con el análisis de rendimiento se ha descargado." })
    } catch (e) {
      console.error("Academic AI error:", e)
      toast({ variant: "destructive", title: "Error de IA", description: "Ocurrió un error al generar el diagnóstico académico." })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateAcademicDiagnosticPdf = (data: AcademicInsightsOutput, info: any, teacher: string) => {
    const doc = new jsPDF("p", "mm", "a4")
    const pageW = 210
    const margin = 20
    const contentW = pageW - margin * 2

    // ============================
    // COVER PAGE
    // ============================
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, pageW, 297, "F")
    doc.setTextColor(251, 191, 36)
    doc.setFontSize(42)
    doc.setFont("helvetica", "bold")
    doc.text("DIAGNÓSTICO", margin, 80)
    doc.text("ACADÉMICO", margin, 118)
    doc.setFontSize(60)
    doc.setTextColor(255, 255, 255)
    doc.text("RENDIMIENTO", margin, 168)
    doc.setFontSize(13)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(148, 163, 184)
    doc.text(`Curso: ${info?.nombre || "N/A"}`, margin, 210)
    doc.text(`Programa: ${info?.programa || "N/A"}`, margin, 224)
    doc.text(`Docente: ${teacher}`, margin, 238)
    doc.text(`Generado: ${new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}`, margin, 252)
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)

    // ============================
    // PAGE 2 — SUMMARY
    // ============================
    doc.addPage()
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, pageW, 40, "F")
    doc.setTextColor(251, 191, 36)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("RESUMEN EJECUTIVO", margin, 26)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 116, 139)

    let y = 56
    doc.setTextColor(55, 65, 81)
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    const summaryLines = doc.splitTextToSize(data.summary, contentW)
    doc.text(summaryLines, margin, y)
    y += summaryLines.length * 6 + 14

    // ---- stats cards ----
    const cardW = (contentW - 12) / 3
    const statCards = [
      { label: "PROMEDIO GRUPAL", value: data.groupAverage.toFixed(1), bg: [239, 246, 255], accent: [37, 99, 235] },
      { label: "APROBADOS", value: `${data.passingRate.toFixed(0)}%`, bg: [240, 253, 244], accent: [22, 163, 74] },
      { label: "DESAPROBADOS", value: `${(100 - data.passingRate).toFixed(0)}%`, bg: [254, 242, 242], accent: [220, 38, 38] },
    ]
    statCards.forEach((card, i) => {
      const x = margin + i * (cardW + 6)
      doc.setFillColor(card.bg[0], card.bg[1], card.bg[2])
      doc.setDrawColor(card.accent[0], card.accent[1], card.accent[2])
      doc.roundedRect(x, y, cardW, 36, 4, 4, "FD")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(card.accent[0], card.accent[1], card.accent[2])
      doc.text(card.label, x + 6, y + 12)
      doc.setFontSize(22)
      doc.setTextColor(30, 41, 59)
      doc.text(card.value, x + 6, y + 30)
    })
    y += 52

    // ============================
    // SECTION 1 — FAILING STUDENTS (GROUPED BY INDICATOR)
    // ============================
    if (data.failingStudents.length > 0) {
      if (y > 230) { doc.addPage(); y = 20 }
      doc.setFillColor(239, 68, 68)
      doc.rect(margin, y, 4, 14, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.setTextColor(15, 23, 42)
      doc.text(`ALUMNOS DESAPROBADOS (${data.failingStudents.length})`, margin + 12, y + 10)
      y += 22

      // table of all failing students
      const failRows = data.failingStudents.map((st: any, i: number) => [
        { content: String(i + 1), styles: { halign: "center", fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" } },
        { content: st.name, styles: { fontStyle: "bold" } },
        { content: `${st.finalGrade}/20`, styles: { halign: "center", fontStyle: "bold", fillColor: [254, 202, 202], textColor: [185, 28, 28] } },
      ])
      autoTable(doc, {
        startY: y,
        head: [[
          { content: "#", styles: { halign: "center", fillColor: [239, 68, 68], textColor: [255, 255, 255] } },
          { content: "ALUMNO", styles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] } },
          { content: "NOTA", styles: { halign: "center", fillColor: [239, 68, 68], textColor: [255, 255, 255] } },
        ]],
        body: failRows,
        theme: "grid",
        headStyles: { fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, lineColor: [226, 232, 240], lineWidth: 0.5 },
        columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: contentW - 48 }, 2: { cellWidth: 24 } },
        margin: { left: margin, right: margin },
      })
      y = (doc as any).lastAutoTable?.finalY || y + 30

      // group by weakestIndicators
      y += 8
      const groups = new Map<string, { students: string[], suggestion: string }>()
      data.failingStudents.forEach((st: any) => {
        const key = st.weakestIndicators || "Otros"
        if (!groups.has(key)) groups.set(key, { students: [], suggestion: st.suggestion || "" })
        groups.get(key)!.students.push(st.name)
      })

      groups.forEach((group, indicators) => {
        if (y > 250) { doc.addPage(); y = 20 }

        // group card
        doc.setFillColor(255, 247, 237)
        doc.roundedRect(margin, y, contentW, 18, 4, 4, "F")
        doc.setFillColor(239, 68, 68)
        doc.rect(margin, y, 4, 18, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8)
        doc.setTextColor(185, 28, 28)
        const indLines = doc.splitTextToSize(indicators, contentW - 16)
        doc.text(indLines, margin + 12, y + 7)
        y += 24

        // student names
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.text("ALUMNOS:", margin + 6, y)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(71, 85, 105)
        const namesText = group.students.join(", ")
        const nameLines = doc.splitTextToSize(namesText, contentW - 18)
        doc.text(nameLines, margin + 6, y + 5)
        y += nameLines.length * 5 + 8

        // suggestion (once per group)
        doc.setFillColor(254, 249, 195)
        doc.roundedRect(margin, y, contentW, 14, 3, 3, "F")
        doc.setFillColor(234, 179, 8)
        doc.rect(margin, y, 3, 14, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(7)
        doc.setTextColor(146, 64, 14)
        doc.text("RECOMENDACIÓN GRUPAL:", margin + 8, y + 5)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(113, 63, 18)
        const sugLines = doc.splitTextToSize(group.suggestion, contentW - 16)
        doc.text(sugLines, margin + 8, y + 10)
        y += 22 + (sugLines.length - 1) * 5
      })
    }

    // ============================
    // SECTION 2 — STRUGGLING EVALUATIONS
    // ============================
    if (data.strugglingEvaluations.length > 0) {
      y += 10
      if (y > 220) { doc.addPage(); y = 20 }
      doc.setFillColor(245, 158, 11)
      doc.rect(margin, y, 4, 14, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.setTextColor(15, 23, 42)
      doc.text("EVALUACIONES CON MAYOR DIFICULTAD", margin + 12, y + 10)
      y += 22

      const evalRows = data.strugglingEvaluations.map((ev: any) => [
        { content: ev.evalName, styles: { fontStyle: "bold" } },
        { content: ev.indicatorCode, styles: { halign: "center" } },
        {
          content: `${ev.failureRate.toFixed(0)}%`,
          styles: {
            halign: "center",
            fontStyle: "bold",
            fillColor: ev.failureRate > 60 ? [254, 202, 202] : ev.failureRate > 30 ? [254, 243, 199] : [220, 252, 231],
            textColor: ev.failureRate > 60 ? [185, 28, 28] : ev.failureRate > 30 ? [146, 64, 14] : [22, 101, 52],
          },
        },
        { content: ev.analysis, styles: { fontStyle: "italic", textColor: [100, 116, 139] } },
      ])
      autoTable(doc, {
        startY: y,
        head: [[
          { content: "EVALUACIÓN", styles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] } },
          { content: "IND.", styles: { halign: "center", fillColor: [245, 158, 11], textColor: [255, 255, 255] } },
          { content: "FRACASO", styles: { halign: "center", fillColor: [245, 158, 11], textColor: [255, 255, 255] } },
          { content: "ANÁLISIS", styles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] } },
        ]],
        body: evalRows,
        theme: "grid",
        headStyles: { fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, lineColor: [226, 232, 240], lineWidth: 0.5 },
        columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 16 }, 2: { cellWidth: 20 }, 3: { cellWidth: contentW - 86 } },
        margin: { left: margin, right: margin },
      })
      y = (doc as any).lastAutoTable?.finalY || y + 30
    }

    // ============================
    // SECTION 3 — PASSING STUDENTS
    // ============================
    if (data.passingStudents.length > 0) {
      y += 12
      if (y > 220) { doc.addPage(); y = 20 }
      doc.setFillColor(34, 197, 94)
      doc.rect(margin, y, 4, 14, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.setTextColor(15, 23, 42)
      doc.text(`ALUMNOS APROBADOS (${data.passingStudents.length})`, margin + 12, y + 10)
      y += 22

      const passRows = data.passingStudents.map((st: any, i: number) => [
        { content: String(i + 1), styles: { halign: "center", fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" } },
        { content: st.name, styles: { fontStyle: "bold" } },
        { content: `${st.finalGrade}/20`, styles: { halign: "center", fontStyle: "bold", fillColor: [220, 252, 231], textColor: [22, 101, 52] } },
        { content: st.strengths, styles: { fontStyle: "italic", textColor: [100, 116, 139] } },
      ])
      autoTable(doc, {
        startY: y,
        head: [[
          { content: "#", styles: { halign: "center", fillColor: [34, 197, 94], textColor: [255, 255, 255] } },
          { content: "ALUMNO", styles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] } },
          { content: "NOTA", styles: { halign: "center", fillColor: [34, 197, 94], textColor: [255, 255, 255] } },
          { content: "FORTALEZAS", styles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] } },
        ]],
        body: passRows,
        theme: "grid",
        headStyles: { fontStyle: "bold", fontSize: 8 },
        bodyStyles: { fontSize: 8, lineColor: [226, 232, 240], lineWidth: 0.5 },
        columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 60 }, 2: { cellWidth: 24 }, 3: { cellWidth: contentW - 96 } },
        margin: { left: margin, right: margin },
      })
      y = (doc as any).lastAutoTable?.finalY || y + 30
    }

    // ============================
    // SECTION 4 — RECOMMENDATIONS
    // ============================
    y += 12
    if (y > 230) { doc.addPage(); y = 20 }
    doc.setFillColor(16, 185, 129)
    doc.rect(margin, y, 4, 14, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text("HOJA DE RUTA DEL DOCENTE — RECOMENDACIONES", margin + 12, y + 10)
    y += 22

    data.recommendations.forEach((r: string, i: number) => {
      if (y > 260) { doc.addPage(); y = 20 }
      doc.setFillColor(i % 2 === 0 ? 236 : 240, i % 2 === 0 ? 253 : 253, i % 2 === 0 ? 245 : 244)
      doc.roundedRect(margin, y, contentW, 16, 3, 3, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(16, 185, 129)
      doc.text("→", margin + 6, y + 10)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(71, 85, 105)
      const recLines = doc.splitTextToSize(r, contentW - 18)
      doc.text(recLines, margin + 14, y + 6)
      y += 18 + (recLines.length - 1) * 5
    })

    // ============================
    // FOOTER
    // ============================
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(156, 163, 175)
      doc.text(`Página ${i} de ${pageCount}`, pageW - margin - doc.getTextWidth(`Página ${i} de ${pageCount}`), 288)
    }

    doc.save(`DIAGNOSTICO_ACADEMICO_${(info?.nombre || "UD").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`)
  }

  const filtered = students.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase()))

  if (isLoading && students.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-black uppercase text-xs tracking-widest text-muted-foreground">Cargando Registro Auxiliar...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-20">
      <GradebookHeader 
        onNewEval={() => setIsNewColOpen(true)} 
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        onAiDiagnostic={runAcademicAnalysis}
        isExporting={isExporting}
        isAnalyzing={isAnalyzing}
      />

      <Card className="border-none shadow-2xl overflow-hidden bg-card rounded-2xl md:rounded-[2.5rem]">
        <GradebookToolbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <CardContent className="p-0 overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-x-auto">
                <Table className="relative border-collapse">
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-none">
                      <TableHead className="pl-6 md:pl-10 font-black text-[10px] uppercase text-muted-foreground tracking-widest w-[250px] md:w-[350px] py-4 md:py-6 sticky left-0 z-30 bg-muted backdrop-blur-sm border-r">
                        Alumno
                      </TableHead>
                      {columns.map(c => (
                        <TableHead key={c.id} className="text-center font-black text-[10px] uppercase text-muted-foreground tracking-widest px-4 md:px-6 border-l min-w-[120px]">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <Badge variant="outline" className="border-primary/20 text-primary text-[8px] font-black">{isRecovery ? '-' : c.indicatorCode}</Badge>
                            {c.strategy === 'grupal' && <Users className="h-3 w-3 text-blue-400" />}
                          </div>
                          <div className="flex items-center gap-2 justify-center">
                            <span className="text-foreground truncate w-24 md:w-32 font-extrabold text-[11px]">{c.name}</span>
                            {c.strategy === 'quizz' && (
                              <button 
                                onClick={() => router.push(`/instructor/quiz/${c.id}?periodo_id=${periodoId}&unidad_id=${params.id}`)}
                                className="h-6 w-6 rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:scale-110"
                              >
                                <Play className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center font-black text-[10px] uppercase text-primary tracking-widest w-[100px] border-l sticky right-0 z-30 bg-primary/5">
                        Promedio
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => {
                      const finalScore = calculateFinal(s.id);
                      return (
                        <TableRow key={s.id} className="hover:bg-muted transition-all border-b">
                          <TableCell className="pl-6 md:pl-10 py-4 sticky left-0 z-20 bg-card border-r">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border-2 border-border shadow-sm">
                                <AvatarFallback className="bg-primary/5 text-primary font-black text-[10px]">{getInitials(s.nombre)}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-bold text-xs text-foreground uppercase truncate w-32 md:w-48">{s.nombre}</span>
                                <span className="text-[8px] text-muted-foreground font-mono">DNI: {s.dni}</span>
                              </div>
                            </div>
                          </TableCell>
                          {columns.map(c => {
                            const gradeValue = grades[s.id]?.[c.id];
                            return (
                              <TableCell key={c.id} className="text-center border-l">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Input 
                                      type="number" 
                                      placeholder="-"
                                      className={cn(
                                        "w-16 h-8 text-center font-bold text-xs border-none shadow-inner rounded-lg", 
                                        (gradeValue !== undefined && gradeValue < 13) ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50'
                                      )} 
                                      value={gradeValue === undefined ? "" : gradeValue} 
                                      onChange={e => handleGradeChange(s.id, c.id, e.target.value)} 
                                    />
                                    {(c.type !== 'manual' && c.type !== 'quizz') && (
                                      <button 
                                        className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary border-2 border-primary/5 flex items-center justify-center" 
                                        onClick={() => { setActiveEval({ student: s, column: c }); setEvalData(evalDetails[s.id]?.[c.id] || {}); setEvalComment(comments[s.id]?.[c.id] || ""); }}
                                      >
                                        <Target className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center bg-primary/5 border-l sticky right-0 z-20">
                            <span className={cn("text-base font-black font-mono", finalScore < 13 ? 'text-red-600' : 'text-primary')}>{finalScore.toString().padStart(2, '0')}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
          setSetupStep(isRecovery ? 1 : 0); setNewIndicatorCode(""); setNewIndicatorDescription(""); setNewIndicatorWeight(0)
          setNewInstrumentWeight(0); setNewColName(""); setNewInstType('manual'); setNewStrategyType('individual')
          setNewMaxPoints(20); setEditorCriteria([]); setStudentGroups({})
        }}
        isRecovery={isRecovery}
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
    <React.Suspense fallback={<div className="h-screen flex flex-col items-center justify-center gap-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="font-black uppercase text-xs tracking-widest text-muted-foreground">Sincronizando...</p></div>}>
      <GradebookContent />
    </React.Suspense>
  )
}
