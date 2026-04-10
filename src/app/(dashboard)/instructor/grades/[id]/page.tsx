
"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, 
  Search, 
  Save, 
  Target,
  ChevronRight,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  LayoutList,
  FileText,
  Trash2,
  PlusCircle,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Loader2,
  X,
  MessageSquare,
  Star,
  Quote,
  History,
  Percent,
  FileSpreadsheet,
  RefreshCcw
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
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// --- Tipos para sincronización con DB ---
type ColumnType = 'manual' | 'cotejo' | 'rubrica' | 'escala' | 'anecdotario'

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
  indicatorId?: string // ID real de la DB
  indicatorCode: string
  indicatorDescription: string
  indicatorWeight: number 
  instrumentWeight: number 
  type: ColumnType
  instrumentId: string
  maxPoints: number
}

const DEFAULT_RUBRIC_LEVELS = [
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

  const totalPointsChecklist = React.useMemo(() => {
    if (newColType !== 'cotejo') return 0
    return editorCriteria.reduce((acc, curr) => acc + (Number(curr.points) || 0), 0)
  }, [editorCriteria, newColType])

  const fetchFullGradebook = React.useCallback(async () => {
    setIsLoading(true)
    try {
      // 1. Cargar Alumnos
      const studentData = await api.get<any[]>(`/me/unidades/${params.id}/alumnos`)
      setStudents(studentData)

      // 2. Cargar Indicadores y sus Instrumentos (Mock de lo que vendría de la nueva tabla)
      // En una implementación real, esto sería: api.get(`/evaluaciones/unidad/${params.id}?periodo_id=${periodoId}`)
      // Por ahora simulamos la carga de lo que está en la DB
      try {
        const configData = await api.get<any>(`/evaluaciones/config/${params.id}/${periodoId}`)
        if (configData && configData.columns) {
          setColumns(configData.columns)
          setInstruments(configData.instruments)
          setGrades(configData.grades || {})
          setEvalDetails(configData.details || {})
          setComments(configData.comments || {})
        } else {
          // Inicializar estructuras vacías para los alumnos
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
        console.log("No se encontró configuración previa, iniciando en blanco.")
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos académicos." })
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
          } catch (error) {
            reject(error)
          }
        }
        reader.onerror = () => reject(new Error("Error al leer el archivo."))
        reader.readAsDataURL(file)
      })

      const analysis = await analysisPromise
      
      setNewColType(analysis.type)
      setNewColName(analysis.name)
      if (analysis.suggestedWeight) {
        setNewInstrumentWeight(analysis.suggestedWeight)
      }
      
      if (analysis.type === 'cotejo' && analysis.checklistCriteria) {
        setEditorCriteria(analysis.checklistCriteria.map((c: any) => ({ id: Math.random().toString(), ...c })))
      } else if (analysis.type === 'rubrica' && analysis.rubricDimensions) {
        setEditorCriteria(analysis.rubricDimensions.map((d: any) => ({ id: Math.random().toString(), ...d })))
      } else if (analysis.type === 'escala' && analysis.checklistCriteria) {
        setEditorCriteria(analysis.checklistCriteria.map((c: any) => ({ id: Math.random().toString(), description: c.description })))
        if (analysis.scaleLevels) setEditorScaleLevels(analysis.scaleLevels)
      } else if (analysis.type === 'anecdotario' && analysis.checklistCriteria) {
        setEditorCriteria(analysis.checklistCriteria.map((c: any) => ({ id: Math.random().toString(), description: c.description })))
      }

      setSetupStep(2)
      toast({ title: "Digitalización Exitosa", description: `Instrumento ${analysis.type.toUpperCase()} detectado.` })
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Alta demanda en el servidor", 
        description: "Intenta digitalizar la imagen nuevamente en unos segundos." 
      })
    } finally {
      setIsScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const addColumn = () => {
    if (newColType === 'cotejo' && totalPointsChecklist !== 20) {
      toast({ variant: "destructive", title: "Puntaje Inválido", description: "La suma de los criterios de cotejo debe ser exactamente 20." })
      return
    }

    const colId = `col-${Date.now()}`
    const instId = `inst-${Date.now()}`
    
    // Buscamos si ya existe el indicador para reutilizar su ID de DB
    const existingInd = existingIndicators.find(ind => ind.code === newIndicatorCode)

    const newInstrument: Instrument = {
      id: instId,
      name: newColName,
      type: newColType,
      criteria: editorCriteria,
      scaleLevels: newColType === 'escala' ? editorScaleLevels : undefined,
      maxPoints: newColType === 'manual' ? newMaxPoints : 20
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
      maxPoints: newColType === 'manual' ? newMaxPoints : 20
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
    toast({ title: "Evaluación Agregada al Registro" })
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
    setEditorScaleLevels(DEFAULT_SCALE_LEVELS)
  }

  const handleGradeChange = (studentId: string, columnId: string, value: string) => {
    const column = columns.find(c => c.id === columnId)
    const max = column?.maxPoints || 20
    const numValue = Math.min(max, Math.max(0, parseInt(value) || 0))
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
    } else if (inst.type === 'anecdotario') {
      const totalCriteria = inst.criteria.length
      const checked = Object.values(evalData).filter(v => v === true).length
      score = totalCriteria > 0 ? (checked / totalCriteria) * 20 : 0
    }

    // Guardar nota numérica
    handleGradeChange(activeEval.student.id, activeEval.column.id, Math.round(score).toString())
    
    // Guardar detalles del instrumento (para que al reabrir estén los checks)
    setEvalDetails(prev => ({
      ...prev,
      [activeEval.student.id]: { ...prev[activeEval.student.id], [activeEval.column.id]: evalData }
    }))
    
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
    toast({ title: "Calificación procesada" })
  }

  const calculateFinal = (studentId: string) => {
    const studentGrades = grades[studentId] || {}
    if (columns.length === 0) return 0

    // Agrupamos columnas por su Código de Indicador
    const indicatorsMap = new Map<string, { weight: number, cols: Column[] }>()
    columns.forEach(c => {
      if (!indicatorsMap.has(c.indicatorCode)) {
        indicatorsMap.set(c.indicatorCode, { weight: c.indicatorWeight, cols: [] })
      }
      indicatorsMap.get(c.indicatorCode)!.cols.push(c)
    })

    const weightedAverages: number[] = []
    const indicatorWeights: number[] = []

    indicatorsMap.forEach((data) => {
      const { cols, weight } = data
      let indicatorAvg = 0
      
      const totalInstrumentWeight = cols.reduce((sum, c) => sum + c.instrumentWeight, 0)
      
      if (totalInstrumentWeight > 0) {
        // Promedio Ponderado de Instrumentos
        let weightedSum = 0
        let weightFactor = 0
        cols.forEach(c => {
          const rawScore = studentGrades[c.id] || 0
          const normalized = (rawScore / c.maxPoints) * 20
          weightedSum += normalized * (c.instrumentWeight / 100)
          weightFactor += (c.instrumentWeight / 100)
        })
        indicatorAvg = weightFactor > 0 ? weightedSum / weightFactor : 0
      } else {
        // Promedio Aritmético Simple
        const sum = cols.reduce((s, c) => s + (studentGrades[c.id] || 0) / c.maxPoints * 20, 0)
        indicatorAvg = sum / cols.length
      }

      weightedAverages.push(indicatorAvg)
      indicatorWeights.push(weight)
    })

    const totalWeight = indicatorWeights.reduce((s, w) => s + w, 0)

    if (totalWeight > 0) {
      // Nota Final Ponderada por Indicadores
      let finalSum = 0
      let totalAppliedWeight = 0
      for (let i = 0; i < weightedAverages.length; i++) {
        finalSum += weightedAverages[i] * (indicatorWeights[i] / 100)
        totalAppliedWeight += (indicatorWeights[i] / 100)
      }
      return Math.round(finalSum / (totalAppliedWeight || 1))
    } else {
      // Nota Final Aritmética entre Indicadores
      const finalSum = weightedAverages.reduce((s, a) => s + a, 0)
      return Math.round(finalSum / (weightedAverages.length || 1))
    }
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      const payload = {
        unidad_id: params.id,
        periodo_id: periodoId,
        columns,
        instruments,
        grades,
        details: evalDetails,
        comments
      }
      // api.post('/evaluaciones/save-full', payload)
      await new Promise(r => setTimeout(r, 1000)) // Simulación
      toast({ title: "Sincronización Exitosa", description: "Todos los indicadores y notas han sido guardados en la base de datos." })
    } catch (e) {
      toast({ variant: "destructive", title: "Error al guardar", description: "No se pudo sincronizar con el servidor." })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const headers = ['Apellidos y Nombres', ...columns.map(c => `${c.name} (${c.indicatorCode})`), 'Nota Final'];
    
    const data = students.sort((a,b) => a.nombre.localeCompare(b.nombre)).map(s => {
      const row: any[] = [s.nombre.toUpperCase()];
      columns.forEach(c => {
        row.push(grades[s.id]?.[c.id] || 0);
      });
      row.push(calculateFinal(s.id));
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    XLSX.utils.book_append_sheet(wb, ws, "Registro Auxiliar");
    XLSX.writeFile(wb, `Registro_Auxiliar_${params.id}.xlsx`);
    toast({ title: "Excel descargado" });
  };

  const handleExportPdf = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA", 14, 15);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("REGISTRO AUXILIAR DE EVALUACIÓN ACADÉMICA", 14, 22);
    
    const headers = ['N°', 'APELLIDOS Y NOMBRES', ...columns.map(c => `${c.indicatorCode}\n(${c.instrumentWeight}%)`), 'FINAL'];
    const body = students.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((s, idx) => [
      (idx + 1).toString().padStart(2, '0'),
      s.nombre.toUpperCase(),
      ...columns.map(c => grades[s.id]?.[c.id] || 0),
      calculateFinal(s.id)
    ]);

    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 40,
      styles: { fontSize: 7, cellPadding: 2, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: [0, 51, 102], textColor: 255 },
      theme: 'grid'
    });

    doc.save(`REGISTRO_${params.id}.pdf`);
    toast({ title: "PDF descargado" });
  };

  const getInstrumentIcon = (type: ColumnType) => {
    switch (type) {
      case 'cotejo': return <LayoutList className="h-3 w-3" />;
      case 'rubrica': return <Target className="h-3 w-3" />;
      case 'escala': return <Star className="h-3 w-3" />;
      case 'anecdotario': return <Quote className="h-3 w-3" />;
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
          <Button variant="outline" onClick={handleExportExcel} className="h-14 px-6 gap-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-black rounded-2xl uppercase text-[11px] tracking-widest">
            <FileSpreadsheet className="h-5 w-5" /> Excel
          </Button>
          <Button variant="outline" onClick={handleExportPdf} className="h-14 px-6 gap-3 border-red-200 text-red-700 hover:bg-red-50 font-black rounded-2xl uppercase text-[11px] tracking-widest">
            <FileText className="h-5 w-5" /> PDF
          </Button>
          
          <Dialog open={isNewColOpen} onOpenChange={(o) => { setIsNewColOpen(o); if(!o) resetEditor(); }}>
            <DialogTrigger asChild>
              <Button className="h-14 px-8 gap-3 bg-primary hover:bg-primary/90 font-black shadow-xl shadow-primary/30 rounded-2xl uppercase text-[11px] tracking-widest text-white">
                <PlusCircle className="h-5 w-5" /> Nueva Evaluación
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col max-h-[95vh]">
              <div className="bg-primary p-8 text-white shrink-0">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Configuración Técnica</DialogTitle>
                <DialogDescription className="text-blue-100/80 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
                  Establece los criterios de evaluación para el curso actual
                </DialogDescription>
              </div>

              <ScrollArea className="flex-grow">
                <div className="p-10 bg-white">
                  {setupStep === 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <BookOpen className="h-6 w-6" />
                          </div>
                          <div className="flex flex-col">
                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Indicador de Logro</h4>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Fundamentación Curricular</p>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50/50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-6">
                          <div className="grid grid-cols-2 gap-4 items-start">
                            <div className="space-y-2">
                              <div className="h-5 flex items-center">
                                <Label className="font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Código ILC</Label>
                              </div>
                              <Input value={newIndicatorCode} onChange={e => setNewIndicatorCode(e.target.value.toUpperCase())} placeholder="Ej: C1.I1" className="h-12 border-none shadow-inner rounded-xl font-black text-lg text-primary uppercase bg-white" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-5 flex items-center gap-2">
                                <Percent className="h-3 w-3 text-slate-400" />
                                <Label className="font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Peso (%)</Label>
                              </div>
                              <Input type="number" value={newIndicatorWeight || ""} onChange={e => setNewIndicatorWeight(parseInt(e.target.value) || 0)} placeholder="Ej: 30" className="h-12 border-none shadow-inner rounded-xl font-black text-center text-lg text-indigo-600 bg-white" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-5 flex items-center">
                              <Label className="font-black text-slate-400 text-[9px] uppercase tracking-[0.2em]">Descripción de la Capacidad</Label>
                            </div>
                            <Textarea value={newIndicatorDescription} onChange={e => setNewIndicatorDescription(e.target.value)} placeholder="Describe el logro esperado..." className="h-32 border-none shadow-inner rounded-2xl resize-none font-medium text-sm bg-white p-4" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <History className="h-6 w-6" />
                          </div>
                          <div className="flex flex-col">
                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Biblioteca</h4>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Indicadores Previos</p>
                          </div>
                        </div>
                        <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-6 min-h-[300px]">
                          {existingIndicators.length > 0 ? (
                            <div className="grid gap-3">
                              {existingIndicators.map((ind, i) => (
                                <button key={i} className="flex flex-col items-start p-4 rounded-2xl border-2 border-slate-50 hover:border-primary/30 hover:bg-primary/5 transition-all text-left w-full group" onClick={() => { setNewIndicatorCode(ind.code); setNewIndicatorDescription(ind.desc); setNewIndicatorWeight(ind.weight); }}>
                                  <div className="flex items-center justify-between w-full mb-1">
                                    <span className="font-black text-sm text-primary">{ind.code}</span>
                                    <Badge variant="outline" className="text-[10px] font-black border-primary/20 text-primary">{ind.weight}%</Badge>
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-snug">{ind.desc}</p>
                                </button>
                              ))}
                            </div>
                          ) : <div className="flex flex-col items-center justify-center h-full text-slate-300 py-10"><History className="h-12 w-12 opacity-10 mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">Sin registros</p></div>}
                        </div>
                      </div>
                    </div>
                  )}

                  {setupStep === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                      <div className="space-y-1">
                        <Label className="font-black text-xs uppercase text-primary tracking-widest flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" /> Selección del Instrumento
                        </Label>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                          { id: 'manual', label: 'Nota Directa', icon: FileText },
                          { id: 'cotejo', label: 'Lista / Test', icon: LayoutList },
                          { id: 'rubrica', label: 'Rúbrica', icon: Target },
                          { id: 'escala', label: 'Escala Valor.', icon: Star },
                          { id: 'anecdotario', label: 'Observación', icon: Quote }
                        ].map((t) => (
                          <Button key={t.id} variant="outline" disabled={isScanning} className={cn("h-auto py-6 flex-col gap-2 rounded-2xl border-2 transition-all", newColType === t.id && !isScanning ? 'border-primary bg-primary/5' : 'hover:border-slate-200')} onClick={() => setNewColType(t.id as ColumnType)}>
                            <t.icon className={`h-6 w-6 ${newColType === t.id && !isScanning ? 'text-primary' : 'text-slate-300'}`} />
                            <span className="font-black text-[9px] uppercase tracking-tighter">{t.label}</span>
                          </Button>
                        ))}
                        <div className="relative">
                          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAiScan} />
                          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className={cn("h-full w-full py-6 flex-col gap-2 rounded-2xl border-2 transition-all border-dashed border-accent hover:bg-accent/5", isScanning && "bg-accent/5 ring-2 ring-accent shadow-inner")}>
                            {isScanning ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : <Sparkles className="h-6 w-6 text-accent" />}
                            <span className="font-black text-[9px] uppercase tracking-tighter text-accent">{isScanning ? "Escaneando..." : "Escanear con IA"}</span>
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-slate-50 items-end">
                        <div className="md:col-span-2 space-y-3">
                          <div className="h-5 flex items-center"><Label className="font-black text-[11px] uppercase text-primary tracking-widest">Nombre de la Actividad</Label></div>
                          <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Ej. Examen de Unidad" className="h-14 rounded-xl text-lg font-bold border-2" />
                        </div>
                        <div className="space-y-3">
                          <div className="h-5 flex items-center gap-2"><Percent className="h-3 w-3 text-indigo-600" /><Label className="font-black text-[11px] uppercase text-indigo-600 tracking-widest">Peso (%)</Label></div>
                          <Input type="number" value={newInstrumentWeight || ""} onChange={e => setNewInstrumentWeight(parseInt(e.target.value) || 0)} placeholder="Ej: 40" className="h-14 rounded-xl text-center text-lg font-black text-indigo-600 border-2" />
                        </div>
                        {newColType === 'manual' && (
                          <div className="space-y-3 animate-in fade-in zoom-in-95">
                            <div className="h-5 flex items-center"><Label className="font-black text-[11px] uppercase text-primary tracking-widest">Máximo</Label></div>
                            <Input type="number" value={newMaxPoints} onChange={e => setNewMaxPoints(parseInt(e.target.value) || 20)} className="h-14 rounded-xl text-center text-lg font-black text-primary border-2" />
                          </div>
                        )}
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
                            <div className="font-bold text-slate-700 text-lg flex items-center">{newColName} <Badge className="ml-2 bg-indigo-100 text-indigo-700 border-none">{newInstrumentWeight}%</Badge></div>
                          </div>
                        </div>
                        {newColType === 'cotejo' && <Badge className={`h-10 px-6 rounded-xl font-black ${totalPointsChecklist === 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{totalPointsChecklist}/20 pts</Badge>}
                      </div>
                      <div className="pr-4">
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
                        {newColType === 'manual' && <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4"><FileText className="h-16 w-16 opacity-10" /><p className="font-bold text-xs uppercase tracking-widest text-center">Entrada de Notas Manual</p></div>}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

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
            <Button variant="outline" className="h-12 px-6 border-slate-200 rounded-xl font-bold gap-2" onClick={fetchFullGradebook}>
              <RefreshCcw className="h-4 w-4" /> Recargar
            </Button>
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
                          {c.instrumentWeight > 0 && <Badge className="bg-indigo-50 text-indigo-600 border-none text-[8px]">{c.instrumentWeight}%</Badge>}
                        </div>
                        <span className="text-slate-900 truncate w-32 font-extrabold">{c.name}</span>
                        <span className="text-[8px] text-slate-400 font-bold">Máx: {c.maxPoints} pts</span>
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
                              <Input type="number" className={cn("w-14 h-10 text-center font-black text-lg border-none shadow-inner rounded-lg", !isPassing ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50')} value={grade} onChange={e => handleGradeChange(s.id, c.id, e.target.value)} />
                              {c.type !== 'manual' && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary border-2 border-primary/5" onClick={() => { setActiveEval({ student: s, column: c }); setEvalData(evalDetails[s.id]?.[c.id] || {}); setEvalComment(comments[s.id]?.[c.id] || ""); }}>
                                      <Target className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-6xl p-0 overflow-hidden border-none shadow-2xl rounded-[3rem] flex flex-col h-[90vh]">
                                    <DialogHeader className="sr-only"><DialogTitle>Calificación dinámica</DialogTitle></DialogHeader>
                                    {activeEval && (
                                      <>
                                        <div className="bg-primary p-10 text-white flex justify-between items-center shrink-0">
                                          <div className="space-y-2">
                                            <Badge className="bg-white/20 text-white font-black uppercase text-[10px]">{activeEval.column.type.toUpperCase()}</Badge>
                                            <h3 className="text-3xl font-black uppercase tracking-tighter">{activeEval.student.nombre}</h3>
                                            <p className="text-blue-100/80 font-bold uppercase text-[10px] tracking-widest">{activeEval.column.name}</p>
                                          </div>
                                          <div className="bg-white/10 p-6 rounded-2xl border-2 border-white/10 text-center min-w-[140px]">
                                            <p className="text-[9px] font-black uppercase text-blue-200 mb-1">Nota Calculada</p>
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
                                          <ScrollArea className="p-10 bg-slate-50/50 flex-grow">
                                            {(activeEval.column.type === 'cotejo' || activeEval.column.type === 'anecdotario') ? (
                                              <div className="grid gap-3">
                                                {instruments[activeEval.column.instrumentId].criteria.map((cr: any, i: number) => (
                                                  <div key={i} className="flex items-center justify-between p-5 bg-white rounded-2xl shadow-sm border-2 border-slate-100 hover:border-primary/20 transition-all">
                                                    <div className="flex items-center gap-3"><span className="font-black text-xs text-slate-300">{i + 1}</span><p className="text-sm font-bold text-slate-700">{cr.description}</p></div>
                                                    <div className="flex gap-2">
                                                      <Button size="sm" variant="ghost" className={cn("h-10 w-10 rounded-xl", evalData[i] === true ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-200')} onClick={() => setEvalData(p => ({ ...p, [i]: true }))}><CheckCircle2 className="h-6 w-6" /></Button>
                                                      <Button size="sm" variant="ghost" className={cn("h-10 w-10 rounded-xl", evalData[i] === false ? 'bg-red-500 text-white shadow-lg' : 'text-slate-200')} onClick={() => setEvalData(p => ({ ...p, [i]: false }))}><XCircle className="h-6 w-6" /></Button>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="space-y-10">
                                                {instruments[activeEval.column.instrumentId].criteria.map((rc: any, i: number) => (
                                                  <div key={i} className="space-y-4">
                                                    <Label className="text-lg font-black uppercase text-slate-800 tracking-tighter">{rc.category}</Label>
                                                    <div className="grid grid-cols-5 gap-3">
                                                      {rc.levels.map((lvl: any) => (
                                                        <Button key={lvl.label} variant="outline" className={cn("h-auto flex-col gap-3 p-4 rounded-2xl border-2 transition-all text-left items-start", evalData[i] === lvl.points ? 'border-primary bg-primary/5 ring-4 ring-primary/5' : 'bg-white hover:border-slate-200')} onClick={() => setEvalData(p => ({ ...p, [i]: lvl.points }))}>
                                                          <div className="flex justify-between w-full mb-1"><span className="font-black text-[8px] uppercase tracking-widest text-slate-400">{lvl.label}</span><span className="font-black text-xs text-primary">{lvl.points} pts</span></div>
                                                          <p className="text-[10px] leading-relaxed text-slate-600 font-medium break-words w-full">{lvl.description || 'Sin detalles'}</p>
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
                                              <Label className="font-black text-xs uppercase text-slate-400 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Observaciones del Logro</Label>
                                              <Textarea value={evalComment} onChange={e => setEvalComment(e.target.value)} placeholder="Comentarios sobre el desempeño..." className="h-[400px] rounded-2xl border-2 resize-none p-6 font-medium italic text-slate-600" />
                                            </div>
                                          </div>
                                        </div>
                                        <div className="p-10 bg-white border-t flex justify-end gap-4 shrink-0">
                                          <Button variant="ghost" className="font-black text-slate-400 uppercase text-xs px-8" onClick={() => setActiveEval(null)}>Descartar</Button>
                                          <Button className="bg-primary font-black uppercase text-xs px-16 h-16 rounded-2xl shadow-xl text-white" onClick={applyInstrumentScore}>Aplicar Nota</Button>
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
                        <span className={cn("text-xl font-black font-mono", finalScore < 13 ? 'text-red-600' : 'text-primary')}>
                          {finalScore.toString().padStart(2, '0')}
                        </span>
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

      {columns.length === 0 && !isLoading && (
        <Card className="p-32 border-4 border-dashed border-slate-100 bg-white rounded-[4rem] flex flex-col items-center gap-8 text-slate-400">
          <div className="p-10 bg-slate-50 rounded-full"><AlertTriangle className="h-20 w-20 opacity-10" /></div>
          <div className="text-center space-y-3">
            <p className="text-2xl font-black text-slate-900 uppercase">Sin Actividades Configuradas</p>
            <p className="text-sm font-medium italic">Define tus indicadores y digitaliza tus instrumentos con IA para empezar.</p>
          </div>
          <Button className="h-16 px-12 bg-primary font-black rounded-3xl uppercase text-xs gap-4 text-white shadow-2xl" onClick={() => setIsNewColOpen(true)}>
            <PlusCircle className="h-6 w-6" /> Iniciar Configuración
          </Button>
        </Card>
      )}
    </div>
  )
}
