"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2, User, ChevronRight, Plus, GraduationCap, Sparkles, Upload,
  Save, Eye, Trash2, FileSpreadsheet, FileText,
  AlertTriangle, CheckCircle2, XCircle,
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import "jspdf-autotable"

interface Matricula {
  id: string; estudiante_id: string; estudiante_nombre: string; estudiante_dni: string
  estudiante_programa: string; curso_nombre: string; periodo: string
  docente_id: string; docente_nombre: string; estado: string
}
interface Evaluacion { id: string; matricula_id: string; titulo: string; nota: number; fecha: string }
interface QuizPregunta { pregunta: string; opciones: string[]; correcta: number }
interface QuizData { id: string; matricula_id: string; titulo: string; preguntas: QuizPregunta[]; estado: string }

interface Props {
  open: boolean; onOpenChange: (v: boolean) => void
  cursoNombre: string; programaNombre: string
  docenteId: string; docenteNombre: string; periodo: string
}

export function RecoveryNotasModal({ open, onOpenChange, cursoNombre, programaNombre, docenteId, docenteNombre, periodo }: Props) {
  const [matriculas, setMatriculas] = React.useState<Matricula[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedMatricula, setSelectedMatricula] = React.useState<Matricula | null>(null)
  const [evaluaciones, setEvaluaciones] = React.useState<Evaluacion[]>([])
  const [evalDialog, setEvalDialog] = React.useState(false)
  const [evalTab, setEvalTab] = React.useState("directa")
  const [newTitulo, setNewTitulo] = React.useState("")
  const [newNota, setNewNota] = React.useState("")
  const [docxFile, setDocxFile] = React.useState<File | null>(null)
  const [quizPreguntas, setQuizPreguntas] = React.useState<QuizPregunta[]>([])
  const [generating, setGenerating] = React.useState(false)
  const [savingQuiz, setSavingQuiz] = React.useState(false)
  const [activeQuiz, setActiveQuiz] = React.useState<QuizData | null>(null)
  const [showQuizModal, setShowQuizModal] = React.useState(false)
  const [quizAnswers, setQuizAnswers] = React.useState<number[]>([])
  const [quizSubmitted, setQuizSubmitted] = React.useState(false)
  const [quizNota, setQuizNota] = React.useState(0)
  const [quizCorrectas, setQuizCorrectas] = React.useState(0)

  React.useEffect(() => { if (open) fetchMatriculas() }, [open])

  const fetchMatriculas = async () => {
    setLoading(true)
    try {
      const data = await api.get<Matricula[]>("/recuperaciones/matriculas?docente_id=" + docenteId)
      setMatriculas(data.filter((m: Matricula) => m.curso_nombre.toLowerCase().includes(cursoNombre.toLowerCase())))
    } catch { setMatriculas([]) } finally { setLoading(false) }
  }

  const loadEvaluaciones = (id: string) => {
    api.get<Evaluacion[]>("/recuperaciones/matriculas/" + id + "/evaluaciones").then(setEvaluaciones).catch(() => setEvaluaciones([]))
  }

  const openMatricula = async (m: Matricula) => {
    setSelectedMatricula(m)
    loadEvaluaciones(m.id)
    setActiveQuiz(null)
    try {
      const q = await api.get<QuizData | null>("/recuperaciones/matriculas/" + m.id + "/quiz")
      if (q) setActiveQuiz(q)
    } catch {}
  }

  const promedio = evaluaciones.length > 0 ? evaluaciones.reduce((s, e) => s + e.nota, 0) / evaluaciones.length : 0

  const handleAddDirecta = async () => {
    if (!selectedMatricula || !newTitulo || !newNota) return
    const nota = parseFloat(newNota)
    if (isNaN(nota) || nota < 0 || nota > 20) { toast({ variant: "destructive", title: "Nota invalida (0-20)" }); return }
    try {
      await api.post("/recuperaciones/evaluaciones", { matricula_id: selectedMatricula.id, titulo: newTitulo, nota })
      loadEvaluaciones(selectedMatricula.id); fetchMatriculas()
      toast({ title: "Evaluacion registrada" })
      setEvalDialog(false); setNewTitulo(""); setNewNota("")
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e?.message }) }
  }

  const docxToMarkdown = async (file: File): Promise<string> => {
    const mammoth = await import("mammoth")
    const Turndown = (await import("turndown")).default
    const html = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })
    return new Turndown().turndown(html.value) || html.value
  }

  const handleGenerate = async () => {
    if (!docxFile) { toast({ variant: "destructive", title: "Sube un archivo .docx" }); return }
    setGenerating(true)
    try {
      const md = await docxToMarkdown(docxFile)
      const { generateRecoveryQuiz } = await import("@/ai/flows/generate-recovery-quiz-flow")
      const r = await generateRecoveryQuiz({ temaMarkdown: md, cantidad: 5 })
      setQuizPreguntas(r.preguntas); toast({ title: "Preguntas via Genkit" })
    } catch {
      try {
        const md = await docxToMarkdown(docxFile)
        const r = await api.post<{ preguntas: QuizPregunta[] }>("/recuperaciones/evaluaciones/generar-preguntas", { texto_markdown: md, cantidad: 5 })
        setQuizPreguntas(r.preguntas); toast({ title: "Preguntas via NVIDIA" })
      } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e?.message }) }
    } finally { setGenerating(false) }
  }

  const handleSaveQuiz = async () => {
    if (!selectedMatricula || quizPreguntas.length === 0) return
    setSavingQuiz(true)
    try {
      const titulo = "Quiz: " + (docxFile?.name?.replace(/\.docx?$/i, "") || "Evaluacion")
      await api.post("/recuperaciones/quiz", { matricula_id: selectedMatricula.id, titulo, preguntas: quizPreguntas })
      toast({ title: "Quiz guardado" }); setEvalDialog(false); setDocxFile(null); setQuizPreguntas([])
      const q = await api.get<QuizData | null>("/recuperaciones/matriculas/" + selectedMatricula.id + "/quiz")
      if (q) setActiveQuiz(q)
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e?.message })
    } finally { setSavingQuiz(false) }
  }

  const handleOpenQuiz = () => {
    if (!activeQuiz) return
    setQuizAnswers(new Array(activeQuiz.preguntas.length).fill(-1))
    setQuizSubmitted(false); setShowQuizModal(true)
  }

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || quizAnswers.some(a => a === -1)) { toast({ variant: "destructive", title: "Responde todas" }); return }
    try {
      const r = await api.post<{ nota: number; correctas: number; total: number }>("/recuperaciones/quiz/" + activeQuiz.id + "/evaluar", { respuestas: quizAnswers })
      setQuizNota(r.nota); setQuizCorrectas(r.correctas); setQuizSubmitted(true)
      setActiveQuiz(null); loadEvaluaciones(selectedMatricula!.id); fetchMatriculas()
      toast({ title: "Quiz evaluado", description: "Nota: " + r.nota + "/20" })
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e?.message }) }
  }

  const handleDeleteEval = async (id: string) => {
    if (!confirm("Eliminar evaluacion?")) return
    try { await api.delete("/recuperaciones/evaluaciones/" + id); loadEvaluaciones(selectedMatricula!.id); fetchMatriculas(); toast({ title: "Eliminada" }) }
    catch { toast({ variant: "destructive", title: "Error" }) }
  }

  const exportExcel = () => {
    if (matriculas.length === 0) return
    const ws = XLSX.utils.json_to_sheet(matriculas.map(m => ({ Estudiante: m.estudiante_nombre, DNI: m.estudiante_dni, Curso: m.curso_nombre, Periodo: m.periodo, Estado: m.estado })))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Recuperaciones")
    XLSX.writeFile(wb, "recuperaciones-" + cursoNombre.replace(/\s+/g, "-") + ".xlsx")
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(14); doc.text("Recuperaciones - " + cursoNombre, 14, 20)
    doc.setFontSize(10); doc.text("Docente: " + docenteNombre + " | Periodo: " + periodo, 14, 28)
    ;(doc as any).autoTable({ head: [["Estudiante", "DNI", "Estado"]], body: matriculas.map(m => [m.estudiante_nombre, m.estudiante_dni, m.estado]), startY: 35 })
    doc.save("recuperaciones-" + cursoNombre.replace(/\s+/g, "-") + ".pdf")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black text-xl flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <div>
              Recuperaciones - {cursoNombre}
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{programaNombre} | {periodo}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 pb-2">
          <Button onClick={exportExcel} variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button onClick={exportPDF} variant="outline" size="sm" className="h-8 gap-1.5 rounded-xl text-xs">
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
          <div className="flex-1" />
          <Badge variant="outline" className="text-xs">{matriculas.length} alumno(s)</Badge>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : matriculas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            <p className="font-bold">Sin alumnos asignados</p>
          </div>
        ) : selectedMatricula ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedMatricula(null)} className="h-8 gap-1 text-xs">
              <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Volver
            </Button>
            <div className="bg-gradient-to-r from-amber-500/5 to-amber-500/10 border border-amber-500/20 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <User className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="font-bold text-foreground">{selectedMatricula.estudiante_nombre}</p>
                  <p className="text-xs text-muted-foreground">{selectedMatricula.estudiante_dni} | {selectedMatricula.curso_nombre}</p>
                </div>
              </div>
              <Badge variant={selectedMatricula.estado === "aprobado" ? "outline" : selectedMatricula.estado === "desaprobado" ? "destructive" : "secondary"}>
                {selectedMatricula.estado === "aprobado" ? <><CheckCircle2 className="h-3 w-3 mr-1" />Aprobado</> :
                 selectedMatricula.estado === "desaprobado" ? <><XCircle className="h-3 w-3 mr-1" />Desaprobado</> :
                 selectedMatricula.estado === "en_curso" ? "En Curso" : "Pendiente"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground">
                {evaluaciones.length} evaluacion(es) | Promedio: <span className={promedio >= 13 ? "text-emerald-500" : "text-red-500"}>{promedio.toFixed(1)}</span>
              </p>
              <Button size="sm" onClick={() => { setEvalDialog(true); setEvalTab("directa"); setDocxFile(null); setQuizPreguntas([]) }}
                className="h-8 rounded-xl text-xs gap-1 bg-amber-500 hover:bg-amber-600">
                <Plus className="h-3.5 w-3.5" /> Evaluar
              </Button>
            </div>
            {activeQuiz && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-bold">{activeQuiz.titulo}</span>
                </div>
                <Button size="sm" onClick={handleOpenQuiz} className="h-7 rounded-lg text-xs bg-emerald-500 hover:bg-emerald-600 gap-1">
                  <Eye className="h-3 w-3" /> Tomar Quiz
                </Button>
              </div>
            )}
            {evaluaciones.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">Sin evaluaciones registradas.</p>
            ) : (
              <div className="space-y-2">
                {evaluaciones.map(ev => (
                  <div key={ev.id} className="flex items-center justify-between bg-muted/30 border rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-bold text-sm">{ev.titulo}</p>
                        <p className="text-[10px] text-muted-foreground">{ev.fecha}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={"font-black " + (ev.nota >= 13 ? "text-emerald-500" : "text-red-500")}>{ev.nota.toFixed(1)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteEval(ev.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {matriculas.map(m => (
              <div key={m.id} onClick={() => openMatricula(m)}
                className="flex items-center justify-between bg-card border rounded-xl px-4 py-3 cursor-pointer hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-bold text-sm text-foreground">{m.estudiante_nombre}</p>
                    <p className="text-[10px] text-muted-foreground">{m.estudiante_dni}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.estado === "aprobado" ? "outline" : m.estado === "desaprobado" ? "destructive" : "secondary"} className="text-[10px]">{m.estado}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}


        <Dialog open={evalDialog} onOpenChange={v => { setEvalDialog(v); if (!v) { setDocxFile(null); setQuizPreguntas([]) } }}>
          <DialogContent className="sm:max-w-2xl rounded-2xl">
            <DialogHeader><DialogTitle className="font-black text-lg">Nueva Evaluacion</DialogTitle></DialogHeader>
            <Tabs value={evalTab} onValueChange={setEvalTab}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="directa">Nota Directa</TabsTrigger>
                <TabsTrigger value="gamificacion">Gamificacion</TabsTrigger>
              </TabsList>
              <TabsContent value="directa" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Titulo</Label>
                  <Input value={newTitulo} onChange={e => setNewTitulo(e.target.value)} placeholder="Ej: Practica 1" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase">Nota (0-20)</Label>
                  <Input type="number" min="0" max="20" step="0.1" value={newNota} onChange={e => setNewNota(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <Button onClick={handleAddDirecta} className="w-full h-11 rounded-xl font-bold bg-amber-500 hover:bg-amber-600">Registrar</Button>
              </TabsContent>
              <TabsContent value="gamificacion" className="space-y-4">
                {quizPreguntas.length === 0 ? (
                  <>
                    <div className="border-2 border-dashed rounded-xl p-5 text-center space-y-3">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="font-bold text-sm">Sube el tema (.docx)</p>
                      <Input type="file" accept=".docx" onChange={e => setDocxFile(e.target.files?.[0] || null)} className="max-w-xs mx-auto h-11 rounded-xl cursor-pointer" />
                    </div>
                    <Button onClick={handleGenerate} disabled={!docxFile || generating} className="w-full h-11 rounded-xl font-bold gap-2 bg-gradient-to-r from-amber-500 to-emerald-500">
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {generating ? "Generando..." : "Generar Preguntas con IA"}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="font-bold text-sm">{quizPreguntas.length} preguntas</p>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {quizPreguntas.map((q, i) => (
                        <div key={i} className="bg-muted/30 border rounded-xl p-3">
                          <p className="font-bold text-xs mb-1">{i + 1}. {q.pregunta}</p>
                          <div className="grid grid-cols-2 gap-1">
                            {q.opciones.map((o, j) => (
                              <span key={j} className={"text-[10px] px-2 py-1 rounded border " + (q.correcta === j ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600" : "border-border text-muted-foreground")}>{o}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleSaveQuiz} disabled={savingQuiz} className="w-full h-11 rounded-xl font-bold gap-2 bg-emerald-500">
                      {savingQuiz ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar Quiz
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>


        <Dialog open={showQuizModal} onOpenChange={setShowQuizModal}>
          <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-black text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" /> {activeQuiz?.titulo}
            </DialogTitle></DialogHeader>
            {quizSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  {quizNota >= 13 ? <CheckCircle2 className="h-10 w-10 text-emerald-500" /> : <XCircle className="h-10 w-10 text-red-500" />}
                </div>
                <p className="font-black text-2xl">{quizNota.toFixed(1)} / 20</p>
                <p className="text-sm text-muted-foreground">{quizCorrectas} de {activeQuiz?.preguntas.length} correctas</p>
                <Badge variant={quizNota >= 13 ? "outline" : "destructive"}>{quizNota >= 13 ? "Aprobado" : "Desaprobado"}</Badge>
                <Button onClick={() => setShowQuizModal(false)} className="mt-4">Cerrar</Button>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {activeQuiz?.preguntas.map((q, i) => (
                  <div key={i} className={"border rounded-xl p-4 space-y-3 " + (quizAnswers[i] !== -1 ? "border-emerald-500/20 bg-emerald-500/5" : "border-border")}>
                    <p className="font-bold text-sm">{i + 1}. {q.pregunta}</p>
                    <div className="space-y-2">
                      {q.opciones.map((o, j) => (
                        <button key={j} onClick={() => { const c = [...quizAnswers]; c[i] = j; setQuizAnswers(c) }}
                          className={"w-full text-left text-sm px-4 py-3 rounded-xl border transition-all " + (quizAnswers[i] === j ? "border-amber-500 bg-amber-500/5 text-amber-700 font-bold" : "border-border text-muted-foreground hover:border-amber-500/30")}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <Button onClick={handleSubmitQuiz} className="w-full h-12 rounded-xl font-bold gap-2 bg-emerald-500 hover:bg-emerald-600">
                  Finalizar y Evaluar
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </DialogContent>
    </Dialog>
  )
}
