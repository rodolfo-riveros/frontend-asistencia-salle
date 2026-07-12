"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, AlertTriangle, BookOpen, User, CheckCircle2, XCircle, Plus, RefreshCw, ChevronRight, GraduationCap, Upload, Sparkles, Save, Eye, Trash2, Check, X } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

const MATRICULAS_KEY = "salle-recovery-matriculas"
const EVALUACIONES_KEY = "salle-recovery-evaluaciones"

interface Matricula {
  id: string
  estudiante_nombre: string
  estudiante_dni: string
  estudiante_programa: string
  curso_nombre: string
  curso_programa: string
  periodo: string
  docente_id: string
  docente_nombre: string
  estado: "pendiente" | "en_curso" | "aprobado" | "desaprobado"
}

interface Evaluacion {
  id: string
  matricula_id: string
  titulo: string
  nota: number
  fecha: string
}

interface QuizPregunta {
  pregunta: string
  opciones: string[]
  correcta: number
}

interface QuizData {
  id: string
  matricula_id: string
  titulo: string
  preguntas: QuizPregunta[]
  estado: string
}

function leerMatriculas(): Matricula[] {
  try { return JSON.parse(localStorage.getItem(MATRICULAS_KEY) || "[]") } catch { return [] }
}
function guardarMatriculas(m: Matricula[]) { localStorage.setItem(MATRICULAS_KEY, JSON.stringify(m)) }

function leerEvaluaciones(): Evaluacion[] {
  try { return JSON.parse(localStorage.getItem(EVALUACIONES_KEY) || "[]") } catch { return [] }
}
function guardarEvaluaciones(e: Evaluacion[]) { localStorage.setItem(EVALUACIONES_KEY, JSON.stringify(e)) }

function generarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function RecoveryTab() {
  const [matriculas, setMatriculas] = React.useState<Matricula[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<Matricula | null>(null)
  const [evaluaciones, setEvaluaciones] = React.useState<Evaluacion[]>([])
  const [evalDialog, setEvalDialog] = React.useState(false)
  const [evalTab, setEvalTab] = React.useState("directa")
  const [userName, setUserName] = React.useState("")

  // Nota directa
  const [newTitulo, setNewTitulo] = React.useState("")
  const [newNota, setNewNota] = React.useState("")

  // Gamificación
  const [docxFile, setDocxFile] = React.useState<File | null>(null)
  const [quizPreguntas, setQuizPreguntas] = React.useState<QuizPregunta[]>([])
  const [generating, setGenerating] = React.useState(false)
  const [showQuizModal, setShowQuizModal] = React.useState(false)
  const [quizAnswers, setQuizAnswers] = React.useState<number[]>([])
  const [quizSubmitted, setQuizSubmitted] = React.useState(false)
  const [quizNota, setQuizNota] = React.useState(0)
  const [quizCorrectas, setQuizCorrectas] = React.useState(0)
  const [activeQuiz, setActiveQuiz] = React.useState<QuizData | null>(null)
  const [savingQuiz, setSavingQuiz] = React.useState(false)

  React.useEffect(() => {
    ;(async () => {
      const { supabase } = await import("@/lib/supabase")
      const { data: { user } } = await supabase.auth.getUser()
      const name = user ? `${user.user_metadata?.firstname || ""} ${user.user_metadata?.lastname || ""}`.trim() : ""
      setUserName(name)
      const todas = leerMatriculas()
      setMatriculas(todas.filter(m => m.docente_nombre === name || m.docente_id === user?.id))
      setIsLoading(false)
    })()
  }, [])

  const loadEvaluaciones = (matriculaId: string) => {
    setEvaluaciones(leerEvaluaciones().filter(e => e.matricula_id === matriculaId))
  }

  const openDetail = async (m: Matricula) => {
    setSelected(m)
    loadEvaluaciones(m.id)
    setActiveQuiz(null)
    try {
      const quiz = await api.get<QuizData | null>(`/recuperaciones/matriculas/${m.id}/quiz`)
      if (quiz) setActiveQuiz(quiz)
    } catch {}
  }

  const promedio = evaluaciones.length > 0
    ? evaluaciones.reduce((s, e) => s + e.nota, 0) / evaluaciones.length
    : 0

  // ── Nota Directa ─────────────────────────────────────────

  const handleAddDirecta = () => {
    if (!selected || !newTitulo || !newNota) {
      toast({ variant: "destructive", title: "Campos requeridos", description: "Título y nota obligatorios." })
      return
    }
    const nota = parseFloat(newNota)
    if (isNaN(nota) || nota < 0 || nota > 20) {
      toast({ variant: "destructive", title: "Nota inválida", description: "Debe ser entre 0 y 20." })
      return
    }

    const evalActual = evaluaciones
    const nueva: Evaluacion = {
      id: generarId(),
      matricula_id: selected.id,
      titulo: newTitulo,
      nota,
      fecha: new Date().toISOString().split("T")[0],
    }
    const todasEval = [...leerEvaluaciones(), nueva]
    guardarEvaluaciones(todasEval)

    const notasActualizadas = [...evalActual, nueva]
    const prom = notasActualizadas.reduce((s, e) => s + e.nota, 0) / notasActualizadas.length
    const nuevoEstado: Matricula["estado"] = prom >= 13 ? "aprobado" : "en_curso"

    const todasMat = leerMatriculas()
    const actualizadas = todasMat.map(m => m.id === selected.id ? { ...m, estado: nuevoEstado } : m)
    guardarMatriculas(actualizadas)
    setMatriculas(prev => prev.map(m => m.id === selected.id ? { ...m, estado: nuevoEstado } : m))
    setSelected(prev => prev ? { ...prev, estado: nuevoEstado } : null)

    loadEvaluaciones(selected.id)
    toast({ title: "Evaluación registrada", description: `Promedio actual: ${prom.toFixed(1)}` })
    setEvalDialog(false)
    setNewTitulo("")
    setNewNota("")
  }

  // ── Gamificación ─────────────────────────────────────────

  const handleDocxToMarkdown = async (file: File): Promise<string> => {
    const mammoth = await import("mammoth")
    const arrayBuffer = await file.arrayBuffer()
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
    const Turndown = (await import("turndown")).default
    const turndown = new Turndown()
    return turndown.turndown(htmlResult.value) || htmlResult.value
  }

  const handleGenerateQuestions = async () => {
    if (!docxFile) {
      toast({ variant: "destructive", title: "Sube un archivo", description: "Selecciona un archivo .docx con el tema." })
      return
    }
    setGenerating(true)
    try {
      const markdown = await handleDocxToMarkdown(docxFile)
      const { generateRecoveryQuiz } = await import("@/ai/flows/generate-recovery-quiz-flow")
      const result = await generateRecoveryQuiz({ temaMarkdown: markdown, cantidad: 5 })
      if (result.preguntas && result.preguntas.length > 0) {
        setQuizPreguntas(result.preguntas)
        toast({ title: "Preguntas generadas", description: `Se generaron ${result.preguntas.length} preguntas vía Genkit.` })
      }
    } catch (err) {
      // Fallback a NVIDIA via FastAPI
      try {
        const mammoth = await import("mammoth")
        const arrayBuffer = await docxFile.arrayBuffer()
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
        const Turndown = (await import("turndown")).default
        const turndown = new Turndown()
        const markdown = turndown.turndown(htmlResult.value)
        const resp = await api.post<{ preguntas: QuizPregunta[]; fuente: string }>(
          "/recuperaciones/evaluaciones/generar-preguntas",
          { texto_markdown: markdown, cantidad: 5 }
        )
        if (resp.preguntas && resp.preguntas.length > 0) {
          setQuizPreguntas(resp.preguntas)
          toast({ title: "Preguntas generadas", description: `Se generaron ${resp.preguntas.length} preguntas vía NVIDIA DeepSeek.` })
        }
      } catch (fallbackErr: any) {
        toast({ variant: "destructive", title: "Error al generar", description: fallbackErr?.message || "Ambos proveedores de IA fallaron." })
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveQuiz = async () => {
    if (!selected || quizPreguntas.length === 0) return
    setSavingQuiz(true)
    try {
      const titulo = `Quiz: ${docxFile?.name?.replace(/\.docx?$/i, "") || "Evaluación Gamificada"}`
      await api.post("/recuperaciones/quiz", {
        matricula_id: selected.id,
        titulo,
        preguntas: quizPreguntas,
      })
      toast({ title: "Quiz guardado", description: "Las preguntas están listas para evaluar." })
      setEvalDialog(false)
      setDocxFile(null)
      setQuizPreguntas([])
      // Reload active quiz
      const quiz = await api.get<QuizData | null>(`/recuperaciones/matriculas/${selected.id}/quiz`)
      if (quiz) setActiveQuiz(quiz)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: err?.message })
    } finally {
      setSavingQuiz(false)
    }
  }

  const handleOpenQuiz = () => {
    if (!activeQuiz) return
    setQuizAnswers(new Array(activeQuiz.preguntas.length).fill(-1))
    setQuizSubmitted(false)
    setShowQuizModal(true)
  }

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || quizAnswers.some(a => a === -1)) {
      toast({ variant: "destructive", title: "Responde todas las preguntas" })
      return
    }
    try {
      const result = await api.post<{ nota: number; correctas: number; total: number }>(
        `/recuperaciones/quiz/${activeQuiz.id}/evaluar`,
        { respuestas: quizAnswers }
      )
      setQuizNota(result.nota)
      setQuizCorrectas(result.correctas)
      setQuizSubmitted(true)
      setActiveQuiz(null)
      loadEvaluaciones(selected!.id)
      toast({ title: "Quiz evaluado", description: `Nota: ${result.nota}/20 (${result.correctas}/${result.total} correctas)` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al evaluar", description: err?.message })
    }
  }

  const handleDeleteEvaluacion = (id: string) => {
    if (!confirm("¿Eliminar esta evaluación?")) return
    const todas = leerEvaluaciones().filter(e => e.id !== id)
    guardarEvaluaciones(todas)
    loadEvaluaciones(selected!.id)
    const notasActualizadas = evaluaciones.filter(e => e.id !== id)
    const prom = notasActualizadas.length > 0
      ? notasActualizadas.reduce((s, e) => s + e.nota, 0) / notasActualizadas.length
      : 0
    const nuevoEstado: Matricula["estado"] = notasActualizadas.length === 0
      ? "pendiente"
      : prom >= 13 ? "aprobado" : "en_curso"
    const todasMat = leerMatriculas()
    const actualizadas = todasMat.map(m => m.id === selected!.id ? { ...m, estado: nuevoEstado } : m)
    guardarMatriculas(actualizadas)
    setMatriculas(prev => prev.map(m => m.id === selected!.id ? { ...m, estado: nuevoEstado } : m))
    setSelected(prev => prev ? { ...prev, estado: nuevoEstado } : null)
    toast({ title: "Evaluación eliminada" })
  }

  return (
    <div className="space-y-6">
      {/* ── Detail view ───────────────────────────── */}
      {selected ? (
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => setSelected(null)} className="h-10 px-4 rounded-xl text-xs font-bold gap-2">
            <ChevronRight className="h-4 w-4 rotate-180" /> Volver a lista
          </Button>

          <Card className="border border-border/60 bg-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-500/5 to-amber-500/10 border-b border-border/60 px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <User className="h-7 w-7 text-amber-500" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl font-black text-foreground">{selected.estudiante_nombre}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selected.curso_nombre} · {selected.curso_programa}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>DNI: {selected.estudiante_dni}</span>
                    <span>Periodo: {selected.periodo}</span>
                    <Badge variant={selected.estado === "aprobado" ? "outline" : selected.estado === "desaprobado" ? "destructive" : "secondary"}>
                      {selected.estado === "aprobado" ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Aprobado</> :
                       selected.estado === "desaprobado" ? <><XCircle className="h-3 w-3 mr-1" /> Desaprobado</> :
                       selected.estado === "en_curso" ? "En Curso" : "Pendiente"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-widest text-muted-foreground">Evaluaciones</h3>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {evaluaciones.length} registro(s) · Promedio: <span className={`font-black ${promedio >= 13 ? "text-emerald-500" : "text-red-500"}`}>{promedio.toFixed(1)}</span>
                      {promedio >= 13 ? " (Aprobado)" : ` (mín. 13)`}
                    </p>
                  </div>
                  <Button onClick={() => { setEvalDialog(true); setEvalTab("directa"); setDocxFile(null); setQuizPreguntas([]) }}
                    className="h-10 px-5 rounded-xl font-bold text-xs gap-2 bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20">
                    <Plus className="h-4 w-4" /> Agregar Evaluación
                  </Button>
                </div>

                {activeQuiz && (
                  <div className="bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-emerald-500" />
                      <div>
                        <p className="font-bold text-sm text-foreground">{activeQuiz.titulo}</p>
                        <p className="text-[10px] text-muted-foreground">{activeQuiz.preguntas.length} preguntas · Pendiente</p>
                      </div>
                    </div>
                    <Button onClick={handleOpenQuiz} className="h-9 px-4 rounded-xl text-xs font-bold gap-2 bg-emerald-500 hover:bg-emerald-600">
                      <Eye className="h-3.5 w-3.5" /> Tomar Quiz
                    </Button>
                  </div>
                )}

                {evaluaciones.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed border-border rounded-2xl">
                    <p className="font-bold">Sin evaluaciones registradas</p>
                    <p className="text-xs mt-1">Agrega la primera evaluación del alumno.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {evaluaciones.map((ev, i) => (
                      <div key={ev.id || i} className="flex items-center justify-between bg-muted/30 border border-border rounded-xl px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <GraduationCap className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{ev.titulo}</p>
                            <p className="text-[10px] text-muted-foreground">{ev.fecha}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className={`font-black text-lg ${ev.nota >= 13 ? "text-emerald-500" : "text-red-500"}`}>{ev.nota.toFixed(1)}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">/ 20</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDeleteEvaluacion(ev.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Dialog: Crear Evaluación ──────────────── */}
          <Dialog open={evalDialog} onOpenChange={v => { setEvalDialog(v); if (!v) { setDocxFile(null); setQuizPreguntas([]) } }}>
            <DialogContent className="sm:max-w-2xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-black text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-amber-500" /> Nueva Evaluación
                </DialogTitle>
              </DialogHeader>
              <Tabs value={evalTab} onValueChange={setEvalTab}>
                <TabsList className="grid grid-cols-2 mb-6">
                  <TabsTrigger value="directa">Nota Directa</TabsTrigger>
                  <TabsTrigger value="gamificacion">Gamificación</TabsTrigger>
                </TabsList>

                <TabsContent value="directa" className="space-y-5 py-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase">Título</Label>
                    <Input value={newTitulo} onChange={e => setNewTitulo(e.target.value)} placeholder="Ej: Parcial 1, Examen Final..." className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase">Nota (0 - 20)</Label>
                    <Input type="number" min="0" max="20" step="0.1" value={newNota} onChange={e => setNewNota(e.target.value)} placeholder="13" className="h-11 rounded-xl" />
                  </div>
                  <Button onClick={handleAddDirecta} className="w-full h-12 rounded-xl font-bold gap-2 bg-amber-500 hover:bg-amber-600">
                    Registrar Evaluación
                  </Button>
                </TabsContent>

                <TabsContent value="gamificacion" className="space-y-5 py-2">
                  {quizPreguntas.length === 0 ? (
                    <>
                      <div className="bg-muted/30 border-2 border-dashed border-border rounded-xl p-6 text-center space-y-4">
                        <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
                        <div>
                          <p className="font-bold text-sm">Sube el tema en formato .docx</p>
                          <p className="text-xs text-muted-foreground mt-1">El sistema convertirá el documento a markdown y generará preguntas con IA.</p>
                        </div>
                        <Input type="file" accept=".docx" onChange={e => setDocxFile(e.target.files?.[0] || null)}
                          className="max-w-xs mx-auto h-11 rounded-xl cursor-pointer" />
                      </div>
                      <Button onClick={handleGenerateQuestions} disabled={!docxFile || generating}
                        className="w-full h-12 rounded-xl font-bold gap-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600">
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {generating ? "Generando preguntas..." : "Generar Preguntas con IA"}
                      </Button>
                      {generating && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Convirtiendo documento...</span>
                          </div>
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full animate-pulse" />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-foreground">{quizPreguntas.length} preguntas generadas</p>
                        <Button variant="ghost" size="sm" onClick={() => setQuizPreguntas([])} className="text-xs text-muted-foreground">
                          Regenerar
                        </Button>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                        {quizPreguntas.map((q, i) => (
                          <div key={i} className="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
                            <p className="font-bold text-xs text-foreground">{i + 1}. {q.pregunta}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {q.opciones.map((opt, j) => (
                                <div key={j} className={`text-xs px-3 py-1.5 rounded-lg border ${q.correcta === j ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600" : "border-border text-muted-foreground"}`}>
                                  {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button onClick={handleSaveQuiz} disabled={savingQuiz} className="w-full h-12 rounded-xl font-bold gap-2 bg-emerald-500 hover:bg-emerald-600">
                        {savingQuiz ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar Quiz
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          {/* ── Modal: Tomar Quiz ──────────────────────── */}
          {activeQuiz && (
            <Dialog open={showQuizModal} onOpenChange={v => { if (!v && !quizSubmitted) setShowQuizModal(v) }}>
              <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-black text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-500" /> {activeQuiz.titulo}
                  </DialogTitle>
                </DialogHeader>
                {quizSubmitted ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                      {quizNota >= 13 ? <CheckCircle2 className="h-10 w-10 text-emerald-500" /> : <XCircle className="h-10 w-10 text-red-500" />}
                    </div>
                    <p className="font-black text-2xl">{quizNota.toFixed(1)} / 20</p>
                    <p className="text-sm text-muted-foreground">{quizCorrectas} de {activeQuiz.preguntas.length} correctas</p>
                    <Badge variant={quizNota >= 13 ? "outline" : "destructive"} className="text-xs">
                      {quizNota >= 13 ? "Aprobado" : "Desaprobado"}
                    </Badge>
                    <Button onClick={() => setShowQuizModal(false)} className="mt-4">Cerrar</Button>
                  </div>
                ) : (
                  <div className="space-y-6 py-2">
                    {activeQuiz.preguntas.map((q, i) => (
                      <div key={i} className={`border rounded-xl p-4 space-y-3 ${quizAnswers[i] !== -1 ? "border-emerald-500/20 bg-emerald-500/5" : "border-border"}`}>
                        <p className="font-bold text-sm text-foreground">{i + 1}. {q.pregunta}</p>
                        <div className="space-y-2">
                          {q.opciones.map((opt, j) => (
                            <button key={j} onClick={() => {
                              const copy = [...quizAnswers]; copy[i] = j; setQuizAnswers(copy)
                            }} className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${quizAnswers[i] === j
                              ? "border-amber-500 bg-amber-500/5 text-amber-700 font-bold"
                              : "border-border text-muted-foreground hover:border-amber-500/30 hover:bg-amber-500/5"}`}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <Button onClick={handleSubmitQuiz} className="w-full h-12 rounded-xl font-bold gap-2 bg-emerald-500 hover:bg-emerald-600">
                      <Check className="h-4 w-4" /> Finalizar y Evaluar
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      ) : (
        /* ── List view ───────────────────────────── */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-black text-sm text-foreground uppercase tracking-tight">Alumnos en Recuperación</h3>
                <p className="text-[10px] text-muted-foreground">Asignados a tu cargo</p>
              </div>
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => {
              const todas = leerMatriculas()
              setMatriculas(todas.filter(m => m.docente_nombre === userName))
            }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : matriculas.length === 0 ? (
            <Card className="p-16 text-center border-2 border-dashed border-border text-muted-foreground bg-card rounded-[2rem]">
              <div className="p-6 bg-muted rounded-full w-fit mx-auto mb-4">
                <AlertTriangle className="h-12 w-12 text-amber-400 opacity-50" />
              </div>
              <p className="font-black text-xl text-foreground uppercase tracking-tighter">Sin alumnos asignados</p>
              <p className="text-sm mt-2">El administrador te asignará alumnos para recuperación.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {matriculas.map(m => (
                <Card key={m.id} className="border border-border/60 bg-card rounded-2xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(m)}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <User className="h-6 w-6 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-bold text-base text-foreground">{m.estudiante_nombre}</p>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{m.curso_nombre}</span>
                            <span>{m.periodo}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {m.estado === "aprobado" ? (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/5"><CheckCircle2 className="h-3 w-3 mr-1" />Aprobado</Badge>
                        ) : m.estado === "desaprobado" ? (
                          <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Desaprobado</Badge>
                        ) : m.estado === "en_curso" ? (
                          <Badge variant="default">En Curso</Badge>
                        ) : (
                          <Badge variant="secondary">Pendiente</Badge>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
