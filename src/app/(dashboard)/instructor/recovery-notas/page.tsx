"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"
import {
  Loader2, GraduationCap, Sparkles, Plus, Upload, Save, Trash2,
  BookOpen, FileSpreadsheet, FileText, ArrowLeft, CheckCircle2, XCircle,
  ClipboardCheck, Play, Users, Eye, Target, Clock, Zap, Crown, ChevronRight,
  AlertTriangle, Link, Trophy, Maximize2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { getInitials, cn } from "@/lib/utils"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useMutation, useQuery } from "convex/react"
import { api as convexApi } from "@convex/_generated/api"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const AVATARS = [
  "Cazador Nocturno", "Guardián de Hierro", "Explorador Salle",
  "Maestro Jedi", "Héroe Ágil", "Escudo Valiente",
  "Místico Astral", "Guerrero Trueno", "Fénix Dorado",
]

interface Matricula {
  id: string; estudiante_id: string; estudiante_nombre: string; estudiante_dni: string
  estudiante_programa: string; curso_nombre: string; periodo: string
  docente_id: string; docente_nombre: string; estado: string
}
interface Evaluacion { id: string; matricula_id: string; titulo: string; nota: number; fecha: string }
interface QuizQuestion { text: string; options: string[]; correctIndex: number; timeLimit?: number }

function RecoveryNotasContent() {
  const params = useSearchParams()
  const router = useRouter()
  const cursoNombre = params.get("curso") || ""
  const programaNombre = params.get("programa") || ""
  const docenteId = params.get("docente_id") || ""
  const docenteNombre = params.get("docente_nombre") || ""
  const periodo = params.get("periodo") || ""

  const [matriculas, setMatriculas] = React.useState<Matricula[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [evaluaciones, setEvaluaciones] = React.useState<Evaluacion[]>([])
  const [notas, setNotas] = React.useState<Record<string, Record<string, number>>>({})
  const [isExporting, setIsExporting] = React.useState(false)

  const [evalStep, setEvalStep] = React.useState(0)
  const [evalType, setEvalType] = React.useState<"directa" | "gamificacion" | null>(null)
  const [evalDialog, setEvalDialog] = React.useState(false)
  const [newTitulo, setNewTitulo] = React.useState("")
  const [docxFile, setDocxFile] = React.useState<File | null>(null)
  const [quizPreguntas, setQuizPreguntas] = React.useState<QuizQuestion[]>([])
  const [generating, setGenerating] = React.useState(false)
  const [tiempoLimite, setTiempoLimite] = React.useState(60)
  const [mostrarRespuestas, setMostrarRespuestas] = React.useState(false)
  const [quizGuardadoId, setQuizGuardadoId] = React.useState<string | null>(null)
  const [quizGuardadoTitulo, setQuizGuardadoTitulo] = React.useState<string | null>(null)
  const [titlesWithQuiz, setTitlesWithQuiz] = React.useState<Set<string>>(new Set())
  const [deleteTargetTitulo, setDeleteTargetTitulo] = React.useState<string | null>(null)

  const [showPreview, setShowPreview] = React.useState(false)
  const [showProjector, setShowProjector] = React.useState(false)
  const [previewQuizId, setPreviewQuizId] = React.useState<string | null>(null)
  const [roomCode, setRoomCode] = React.useState("")
  const createRoom = useMutation(convexApi.rooms.createRoom)
  const updateStatus = useMutation(convexApi.rooms.updateStatus)
  const arenaRoom = useQuery(convexApi.rooms.getRoom, roomCode ? { roomCode } : "skip")
  const [instructorTimeLeft, setInstructorTimeLeft] = React.useState(0)
  const autoAdvanceRef = React.useRef(false)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const timerIsRunningRef = React.useRef(false)
  const arenaRoomRef = React.useRef(arenaRoom)
  arenaRoomRef.current = arenaRoom
  const roomCodeRef = React.useRef(roomCode)
  roomCodeRef.current = roomCode

  const generatePin = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  const autoLaunched = React.useRef(false)

  React.useEffect(() => { if (cursoNombre) fetchMatriculas() }, [cursoNombre])

  // Timer countdown en el proyector
  React.useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerIsRunningRef.current = false
    if (arenaRoom?.status !== "active") {
      setInstructorTimeLeft(0)
      autoAdvanceRef.current = false
      return
    }
    const currentQ = arenaRoom.questions[arenaRoom.currentQuestionIndex]
    const limit = currentQ?.timeLimit || 60
    setInstructorTimeLeft(limit)
    autoAdvanceRef.current = false

    timerRef.current = setInterval(() => {
      timerIsRunningRef.current = true
      setInstructorTimeLeft(prev => prev - 1)
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [arenaRoom?.status, arenaRoom?.currentQuestionIndex])

  // Auto-avanzar cuando el timer llega a 0
  React.useEffect(() => {
    if (arenaRoom?.status !== "active" || instructorTimeLeft > 0 || autoAdvanceRef.current || !timerIsRunningRef.current) return
    autoAdvanceRef.current = true
    if (timerRef.current) clearInterval(timerRef.current)

    const t = setTimeout(async () => {
      const r = arenaRoomRef.current
      const code = roomCodeRef.current
      if (!r || !code) return
      const nextIdx = r.currentQuestionIndex + 1
      if (nextIdx >= r.questions.length) {
        await updateStatus({ roomCode: code, status: "finished" })
        toast({ title: "Juego finalizado", description: "Calculando notas..." })
        await syncArenaGrades()
      } else {
        await updateStatus({ roomCode: code, status: "active", nextQuestion: nextIdx })
      }
    }, 300)
    return () => clearTimeout(t)
  }, [instructorTimeLeft, arenaRoom?.status])

  const fetchMatriculas = async () => {
    setLoading(true)
    try {
      const data = await api.get<Matricula[]>("/recuperaciones/matriculas?docente_id=" + docenteId)
      const filtered = data.filter((m: Matricula) => m.curso_nombre.toLowerCase().includes(cursoNombre.toLowerCase()))
      setMatriculas(filtered)

      const evalPromises = filtered.map(m =>
        api.get<Evaluacion[]>("/recuperaciones/matriculas/" + m.id + "/evaluaciones").catch(() => [] as Evaluacion[])
      )
      const allEvals = await Promise.all(evalPromises)
      // Deduplicar por título para evitar columnas repetidas
      const uniqueEvals = new Map<string, Evaluacion>()
      allEvals.flat().forEach(ev => {
        if (!uniqueEvals.has(ev.titulo)) uniqueEvals.set(ev.titulo, ev)
      })
      setEvaluaciones(Array.from(uniqueEvals.values()).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()))

      const notasMap: Record<string, Record<string, number>> = {}
      filtered.forEach((m, i) => {
        notasMap[m.estudiante_id] = {}
        allEvals[i].forEach(ev => { notasMap[m.estudiante_id][ev.titulo] = ev.nota })
      })
      setNotas(notasMap)

      // Load all quizzes for all matrículas
      const quizTitles = new Set<string>()
      let foundFirst = false
      for (const m of filtered) {
        try {
          const quizzes = await api.get<any[]>("/recuperaciones/matriculas/" + m.id + "/quizzes")
          for (const q of quizzes) {
              if (q?.preguntas?.length) {
              quizTitles.add(q.titulo)
              const rawPreguntas: any[] = typeof q.preguntas === "string" ? JSON.parse(q.preguntas) : q.preguntas
              if (!foundFirst) {
                foundFirst = true
                setQuizGuardadoId(q.id)
                setQuizGuardadoTitulo(q.titulo)
                setQuizPreguntas(rawPreguntas.map((pq: any) => ({
                  text: pq.pregunta || "",
                  options: pq.opciones || [],
                  correctIndex: pq.correcta ?? 0,
                  timeLimit: tiempoLimite,
                })))
              }
            }
          }
        } catch { /* no quizzes */ }
      }
      setTitlesWithQuiz(quizTitles)

      // Auto-crear evaluaciones faltantes para quizzes que no tienen evaluación
      const existingTitles = new Set(Array.from(uniqueEvals.values()).map(e => e.titulo))
      const needsSync = Array.from(quizTitles).some(t => !existingTitles.has(t))
      if (needsSync) {
        for (const m of filtered) {
          try {
            const quizzes = await api.get<any[]>("/recuperaciones/matriculas/" + m.id + "/quizzes")
            for (const q of quizzes) {
              if (q?.preguntas?.length && !existingTitles.has(q.titulo)) {
                await api.post("/recuperaciones/evaluaciones", {
                  matricula_id: m.id, titulo: q.titulo, nota: 0,
                }).catch(() => {})
              }
            }
          } catch { /* no quizzes */ }
        }
        // Re-fetch evaluations after syncing
        const evalPromises2 = filtered.map(m =>
          api.get<Evaluacion[]>("/recuperaciones/matriculas/" + m.id + "/evaluaciones").catch(() => [] as Evaluacion[])
        )
        const allEvals2 = await Promise.all(evalPromises2)
        const uniqueEvals2 = new Map<string, Evaluacion>()
        allEvals2.flat().forEach(ev => uniqueEvals2.set(ev.id, ev))
        setEvaluaciones(Array.from(uniqueEvals2.values()).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()))
        const notasMap2: Record<string, Record<string, number>> = {}
        filtered.forEach((m, i) => {
          notasMap2[m.estudiante_id] = {}
          allEvals2[i].forEach(ev => { notasMap2[m.estudiante_id][ev.id] = ev.nota })
        })
        setNotas(notasMap2)
      }
    } catch { setMatriculas([]) } finally { setLoading(false) }
  }

  const filteredStudents = matriculas.filter(m =>
    m.estudiante_nombre.toLowerCase().includes(searchTerm.toLowerCase()) || m.estudiante_dni.includes(searchTerm)
  )

  const calculatePromedio = (studentId: string) => {
    const vals = Object.values(notas[studentId] || {}).filter(n => n !== undefined)
    if (vals.length === 0) return null
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
  }

  const handleGradeChange = async (matriculaId: string, estudianteId: string, titulo: string, value: string) => {
    if (value === "") {
      setNotas(prev => { const n = { ...prev }; if (n[estudianteId]) { const u = { ...n[estudianteId] }; delete u[titulo]; n[estudianteId] = u } return n })
      return
    }
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0 || numValue > 20) return
    setNotas(prev => ({ ...prev, [estudianteId]: { ...(prev[estudianteId] || {}), [titulo]: numValue } }))
    try {
      await api.post("/recuperaciones/evaluaciones", {
        matricula_id: matriculaId, titulo, nota: numValue
      })
    } catch { toast({ variant: "destructive", title: "Error de sincronización" }) }
  }

  const resetModal = () => {
    setEvalStep(0); setEvalType(null); setNewTitulo(""); setDocxFile(null); setQuizPreguntas([])
    setTiempoLimite(20); setMostrarRespuestas(false); setEvalDialog(false); setShowPreview(false)
  }

  const docxToMarkdown = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase()
    if (name.endsWith(".pdf")) {
      toast({ title: "PDF detectado", description: "Extrayendo solo el texto del contenido..." })
      const { PDFParse } = await import("pdf-parse")
      PDFParse.setWorker("/pdf.worker.mjs")
      const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) })
      const result = await parser.getText()
      return result.text
    }
    const mammoth = await import("mammoth")
    const Turndown = (await import("turndown")).default
    const html = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })
    return new Turndown().turndown(html.value) || html.value
  }

  const handleGenerate = async () => {
    if (!docxFile) { toast({ variant: "destructive", title: "Sube un archivo .docx o .pdf" }); return }
    setGenerating(true)
    toast({ title: "Generando 20 preguntas...", description: "Paso 1/3: Genkit (Gemini)..." })
    const md = await docxToMarkdown(docxFile)
    // 1) Genkit (Gemini via Next.js server, no extra network hop)
    const genkitPromise = (async () => {
      const { generateRecoveryQuiz } = await import("@/ai/flows/generate-recovery-quiz-flow")
      return generateRecoveryQuiz({ temaMarkdown: md, cantidad: 20 })
    })()
    const genkitWithTimeout = Promise.race([
      genkitPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 30000)),
    ])
    try {
      const r = await genkitWithTimeout
      setQuizPreguntas(r.preguntas.map(q => ({ text: q.pregunta, options: q.opciones, correctIndex: q.correcta, timeLimit: tiempoLimite })))
      toast({ title: "20 preguntas generadas", description: "IA: Genkit (Gemini directo)" })
      setGenerating(false); return
    } catch { /* fall through */ }
    // 2) FastAPI → NVIDIA (funciona bien, ~30-60s)
    toast({ title: "Generando 20 preguntas...", description: "Paso 2/3: NVIDIA DeepSeek..." })
    try {
      const r = await api.post<{ preguntas: any[]; fuente: string }>(
        "/recuperaciones/evaluaciones/generar-preguntas",
        { texto_markdown: md, cantidad: 20 },
        { signal: AbortSignal.timeout(90000) },
      )
      const normalizadas: QuizQuestion[] = (r.preguntas || []).map(q => ({
        text: q.text || q.pregunta || "",
        options: q.options || q.opciones || [],
        correctIndex: q.correctIndex ?? q.correcta ?? 0,
        timeLimit: tiempoLimite,
      }))
      setQuizPreguntas(normalizadas)
      const fuente = (r as any).fuente || "nvidia"
      toast({ title: "20 preguntas generadas", description: `IA: ${fuente === "gemini" ? "Gemini 2.5 Flash" : "NVIDIA DeepSeek"}` })
      setGenerating(false); return
    } catch { /* fall through */ }
    // 3) Gemini directo via FastAPI (último recurso)
    toast({ title: "Generando 20 preguntas...", description: "Paso 3/3: Gemini (pago)..." })
    try {
      const r = await api.post<{ preguntas: any[]; fuente: string }>(
        "/recuperaciones/evaluaciones/generar-preguntas-forzar-gemini",
        { texto_markdown: md, cantidad: 20 },
        { signal: AbortSignal.timeout(90000) },
      )
      const normalizadas: QuizQuestion[] = (r.preguntas || []).map(q => ({
        text: q.text || q.pregunta || "",
        options: q.options || q.opciones || [],
        correctIndex: q.correctIndex ?? q.correcta ?? 0,
        timeLimit: tiempoLimite,
      }))
      setQuizPreguntas(normalizadas)
      toast({ title: "20 preguntas generadas", description: "IA: Gemini 2.5 Flash (pago)" })
      setGenerating(false); return
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e?.message }) }
    setGenerating(false)
  }

  const handleExportExamPdf = () => {
    if (quizPreguntas.length === 0) return
    const doc = new jsPDF("p", "mm", "a4")
    doc.setFontSize(16); doc.setTextColor(0, 51, 102); doc.setFont("helvetica", "bold")
    doc.text(newTitulo || "EXAMEN DE RECUPERACIÓN", 105, 20, { align: "center" })
    doc.setFontSize(10); doc.setTextColor(100); doc.setFont("helvetica", "normal")
    doc.text(`${cursoNombre} - ${periodo}`, 105, 28, { align: "center" })
    doc.text(`Docente: ${docenteNombre}`, 105, 34, { align: "center" })
    doc.setFontSize(8); doc.setTextColor(150)
    doc.text("_________________________________________________", 105, 40, { align: "center" })

    let y = 50
    quizPreguntas.forEach((q, i) => {
      if (y > 265) { doc.addPage(); y = 20 }
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(0)
      doc.text(`${i + 1}. ${q.text}`, 14, y)
      y += 8
      doc.setFont("helvetica", "normal"); doc.setFontSize(10)
      q.options.forEach((o, j) => {
        if (y > 275) { doc.addPage(); y = 20 }
        doc.text(`${String.fromCharCode(65 + j)}. ${o}`, 20, y)
        y += 6
      })
      y += 4
    })

    doc.save((newTitulo || "EXAMEN_RECUPERACION").replace(/\s+/g, "_") + ".pdf")
    toast({ title: "PDF exportado", description: "Listo para imprimir" })
  }

  const handleExportQuestionsPdf = () => {
    if (quizPreguntas.length === 0) return
    const doc = new jsPDF("p", "mm", "a4")
    const pageW = 210
    const margin = 20
    const contentW = pageW - margin * 2

    // ── HEADER ──
    doc.setFillColor(0, 51, 102); doc.rect(0, 0, pageW, 8, "F")
    doc.setFillColor(200, 170, 80); doc.rect(0, 8, pageW, 1.5, "F")

    doc.setFontSize(14); doc.setTextColor(0, 51, 102); doc.setFont("helvetica", "bold")
    doc.text("INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA", pageW / 2, 18, { align: "center" })
    doc.setFontSize(9); doc.setTextColor(100); doc.setFont("helvetica", "normal")
    doc.text("SISTEMA DE GESTIÓN DE ASISTENCIA Y EVALUACIONES", pageW / 2, 24, { align: "center" })

    doc.setDrawColor(200, 170, 80); doc.setLineWidth(0.5)
    doc.line(margin, 28, pageW - margin, 28)

    // ── TITLE ──
    doc.setFontSize(16); doc.setTextColor(0, 51, 102); doc.setFont("helvetica", "bold")
    doc.text((newTitulo || "EVALUACIÓN DE RECUPERACIÓN").toUpperCase(), pageW / 2, 35, { align: "center" })
    doc.setFontSize(10); doc.setTextColor(80); doc.setFont("helvetica", "normal")
    doc.text(`Curso: ${cursoNombre.toUpperCase()}    |    Periodo: ${periodo.toUpperCase()}`, pageW / 2, 41, { align: "center" })
    doc.text(`Docente: ${docenteNombre.toUpperCase()}`, pageW / 2, 46, { align: "center" })

    doc.setDrawColor(200); doc.setLineWidth(0.3)
    doc.line(margin, 50, pageW - margin, 50)

    // ── STUDENT INFO ──
    let y = 56
    doc.setFontSize(9); doc.setTextColor(80); doc.setFont("helvetica", "normal")
    doc.text("Apellidos y Nombres: _______________________________________________", margin, y); y += 7
    doc.text(`Fecha: _______________     Nota: _______________     Tiempo: ${tiempoLimite}s/pregunta`, margin, y); y += 10

    // ── INSTRUCTIONS ──
    doc.setFillColor(240, 243, 250); doc.roundedRect(margin, y, contentW, 16, 2, 2, "F")
    doc.setFontSize(8); doc.setTextColor(60); doc.setFont("helvetica", "bold")
    doc.text("INSTRUCCIONES:", margin + 4, y + 5)
    doc.setFont("helvetica", "normal")
    doc.text("Lee cada pregunta con atención. Selecciona la opción correcta marcando con un aspa (X) o círculo.", margin + 4, y + 11)
    y += 22

    // ── QUESTIONS ──
    let pageNum = 1
    quizPreguntas.forEach((q, i) => {
      if (y > 255) {
        doc.setFontSize(8); doc.setTextColor(150)
        doc.text(`Página ${pageNum}`, pageW / 2, 288, { align: "center" })
        doc.addPage(); pageNum++
        doc.setFillColor(0, 51, 102); doc.rect(0, 0, pageW, 6, "F")
        doc.setFontSize(7); doc.setTextColor(255); doc.setFont("helvetica", "bold")
        doc.text(`${(newTitulo || "EVALUACIÓN").toUpperCase()} — CONTINUACIÓN`, pageW / 2, 4, { align: "center" })
        y = 15
      }

      // Question number + text
      doc.setFontSize(10); doc.setTextColor(0); doc.setFont("helvetica", "bold")
      const qText = doc.splitTextToSize(`${i + 1}. ${q.text}`, contentW)
      doc.text(qText, margin, y)
      y += qText.length * 5 + 2

      // Options
      doc.setFontSize(9); doc.setFont("helvetica", "normal")
      q.options.forEach((o, j) => {
        if (y > 270) {
          doc.setFontSize(8); doc.setTextColor(150)
          doc.text(`Página ${pageNum}`, pageW / 2, 288, { align: "center" })
          doc.addPage(); pageNum++
          doc.setFillColor(0, 51, 102); doc.rect(0, 0, pageW, 6, "F")
          doc.setFontSize(7); doc.setTextColor(255); doc.setFont("helvetica", "bold")
          doc.text(`${(newTitulo || "EVALUACIÓN").toUpperCase()} — CONTINUACIÓN`, pageW / 2, 4, { align: "center" })
          y = 15
        }
        const letter = String.fromCharCode(65 + j)
        const esCorrecta = j === q.correctIndex
        doc.setTextColor(esCorrecta && mostrarRespuestas ? 0 : 60)
        doc.setFont("helvetica", esCorrecta && mostrarRespuestas ? "bold" : "normal")
        const optText = doc.splitTextToSize(`${letter}) ${o}`, contentW - 10)
        doc.text(optText, margin + 5, y)
        y += optText.length * 4.5 + 1
      })
      y += 4

      // Option bubbles (○) for marking
      doc.setDrawColor(180)
      q.options.forEach((_, j) => {
        const bx = margin + j * 45
        doc.circle(bx + 3, y - 2, 2.5, "S")
        doc.setFontSize(6); doc.setTextColor(150); doc.setFont("helvetica", "normal")
        doc.text(String.fromCharCode(65 + j), bx + 3, y + 4, { align: "center" })
      })
      y += 8
    })

    // ── PAGE NUMBER ──
    doc.setFontSize(8); doc.setTextColor(150)
    doc.text(`Página ${pageNum}`, pageW / 2, 288, { align: "center" })

    // ── ANSWER KEY (on request) ──
    if (mostrarRespuestas) {
      doc.addPage()
      doc.setFillColor(0, 51, 102); doc.rect(0, 0, pageW, 8, "F")
      doc.setFillColor(200, 170, 80); doc.rect(0, 8, pageW, 1.5, "F")

      doc.setFontSize(14); doc.setTextColor(0, 51, 102); doc.setFont("helvetica", "bold")
      doc.text("CLAVE DE RESPUESTAS", pageW / 2, 24, { align: "center" })
      doc.setFontSize(9); doc.setTextColor(80); doc.setFont("helvetica", "normal")
      doc.text(`${(newTitulo || "EVALUACIÓN").toUpperCase()}`, pageW / 2, 30, { align: "center" })
      doc.line(margin, 34, pageW - margin, 34)

      // Answer table
      const half = Math.ceil(quizPreguntas.length / 2)
      const leftCol = quizPreguntas.slice(0, half)
      const rightCol = quizPreguntas.slice(half)
      const maxRows = Math.max(leftCol.length, rightCol.length)

      const rows = []
      for (let i = 0; i < maxRows; i++) {
        const left = leftCol[i]
        const right = rightCol[i]
        rows.push([
          left ? `${leftCol.indexOf(left) + 1}. ${String.fromCharCode(65 + left.correctIndex)}` : "",
          right ? `${half + rightCol.indexOf(right) + 1}. ${String.fromCharCode(65 + right.correctIndex)}` : "",
        ])
      }

      autoTable(doc, {
        startY: 38,
        head: [["PREGUNTA", "RESPUESTA"]],
        body: rows,
        theme: "grid",
        styles: { fontSize: 9, halign: "center", cellPadding: 3 },
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
        columnStyles: { 0: { fontStyle: "bold" } },
        margin: { left: margin, right: margin },
      })

      // Extra detail
      if (typeof (doc as any).lastAutoTable === "object") {
        const finalY = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(8); doc.setTextColor(100); doc.setFont("helvetica", "normal")
        doc.text(`Total de preguntas: ${quizPreguntas.length}     |     Puntaje máximo: 20     |     Aprobatorio: ≥ 13`, pageW / 2, finalY, { align: "center" })
      }
    }

    // ── FOOTER ──
    doc.setFillColor(0, 51, 102); doc.rect(0, 293, pageW, 4, "F")

    doc.save((newTitulo || "BANCO_PREGUNTAS").replace(/\s+/g, "_") + ".pdf")
    toast({ title: "PDF exportado", description: "Documento profesional generado" })
  }

  const handleSaveEvaluacion = async () => {
    if (!newTitulo) { toast({ variant: "destructive", title: "Ingresa un titulo" }); return }
    if (quizPreguntas.length === 0) { toast({ variant: "destructive", title: "Genera preguntas primero" }); return }

    try {
      // Guardar preguntas en backend primero (si hay)
      if (matriculas.length > 0) {
        await api.post("/recuperaciones/quiz", {
          matricula_id: matriculas[0].id,
          titulo: newTitulo,
          preguntas: quizPreguntas.map(q => ({
            pregunta: q.text,
            opciones: q.options,
            correcta: q.correctIndex,
          })),
        })
      }

      // Solo crear evaluación si no existe una con el mismo título
      const existingTitles = new Set(evaluaciones.map(e => e.titulo))
      if (!existingTitles.has(newTitulo)) {
        for (const m of matriculas) {
          await api.post("/recuperaciones/evaluaciones", {
            matricula_id: m.id, titulo: newTitulo, nota: 0,
          })
        }
      }

      await fetchMatriculas()
      toast({ title: "Guardado", description: evalType === "directa" ? "Examen guardado" : "Quiz guardado. Haz clic en ▶ para lanzar arena" })
      resetModal()
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e?.message }) }
  }

  const handleLaunchArena = async (titulo?: string) => {
    const targetTitulo = titulo || quizGuardadoTitulo || ""
    if (titulo) {
      let found = false
      for (const m of matriculas) {
        try {
          const quizzes = await api.get<any[]>("/recuperaciones/matriculas/" + m.id + "/quizzes")
          const match = quizzes.find((q: any) => q.titulo === titulo && q?.preguntas?.length)
          if (match) {
            setQuizGuardadoId(match.id)
            setPreviewQuizId(match.id)
            setQuizGuardadoTitulo(match.titulo)
            const rawPreguntas: any[] = typeof match.preguntas === "string" ? JSON.parse(match.preguntas) : match.preguntas
            setQuizPreguntas(rawPreguntas.map((pq: any) => ({
              text: pq.pregunta || "",
              options: pq.opciones || [],
              correctIndex: pq.correcta ?? 0,
              timeLimit: tiempoLimite,
            })))
            found = true
            break
          }
        } catch { /* skip */ }
      }
      if (!found) { toast({ variant: "destructive", title: "Sin preguntas", description: "No se encontró el quiz" }); return }
    } else if (quizPreguntas.length === 0) {
      toast({ variant: "destructive", title: "Sin preguntas" }); return
    }
    setNewTitulo(targetTitulo)
    setEvalType("gamificacion")
    setShowPreview(true)
  }

  const handleAbrirArena = async () => {
    if (quizPreguntas.length === 0) { toast({ variant: "destructive", title: "Sin preguntas" }); return }
    const pin = generatePin()
    const preguntasConTiempo = quizPreguntas.map(q => ({ ...q, timeLimit: tiempoLimite }))
    try {
      await createRoom({ roomCode: pin, questions: preguntasConTiempo, configId: "RECOVERY", unidadId: "RECOVERY" })
      setRoomCode(pin)
      setEvalDialog(false)
      setShowPreview(false)
      setShowProjector(true)
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e?.message }) }
  }

  const handleStartGame = async () => {
    if (!roomCode) return
    await updateStatus({ roomCode, status: "active", nextQuestion: 0 })
  }

  const handleNextQuestion = async () => {
    if (!roomCode || !arenaRoom) return
    const nextIdx = arenaRoom.currentQuestionIndex + 1
    if (nextIdx >= arenaRoom.questions.length) {
      await updateStatus({ roomCode, status: "finished" })
      toast({ title: "Juego finalizado", description: "Calculando notas..." })
      await syncArenaGrades()
    } else {
      await updateStatus({ roomCode, status: "active", nextQuestion: nextIdx })
    }
  }

  const syncArenaGrades = async () => {
    if (!arenaRoom) return
    const totalQ = arenaRoom.questions.length
    for (const p of arenaRoom.participants) {
      const correctas = p.answers?.filter((a: any) => a.isCorrect).length || 0
      const nota = Math.round((correctas / totalQ) * 20 * 100) / 100
      const matricula = matriculas.find(m => m.estudiante_dni === p.alumno_id || m.estudiante_nombre.toLowerCase().includes(p.name.toLowerCase()))
      if (matricula) {
        await api.post("/recuperaciones/evaluaciones", {
          matricula_id: matricula.id, titulo: newTitulo || "Quiz recuperacion", nota,
        })
      }
    }
    await fetchMatriculas()
    toast({ title: "Notas sincronizadas" })
  }

  const handleFinishGame = async () => {
    if (!roomCode) return
    await updateStatus({ roomCode, status: "finished" })
  }

  const handleDeleteEval = async (titulo: string) => {
    try {
      // Eliminar evaluaciones con ese título en todas las matrículas
      for (const m of matriculas) {
        const evals = await api.get<Evaluacion[]>("/recuperaciones/matriculas/" + m.id + "/evaluaciones").catch(() => [] as Evaluacion[])
        for (const ev of evals.filter(e => e.titulo === titulo)) {
          await api.delete("/recuperaciones/evaluaciones/" + ev.id).catch(() => {})
        }
        // También eliminar el quiz asociado
        const quizzes = await api.get<any[]>("/recuperaciones/matriculas/" + m.id + "/quizzes").catch(() => [])
        for (const q of quizzes.filter((q: any) => q.titulo === titulo)) {
          await api.delete("/recuperaciones/quiz/" + q.id).catch(() => {})
        }
      }
      await fetchMatriculas()
      toast({ title: "Evaluación eliminada" })
    } catch { toast({ variant: "destructive", title: "Error al eliminar" }) }
  }

  const handleExportExcel = () => {
    if (matriculas.length === 0) return
    setIsExporting(true)
    try {
      const rows: any[] = []
      rows.push(["INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA"])
      rows.push(["REGISTRO AUXILIAR DE RECUPERACIÓN"])
      rows.push([])
      rows.push(["CURSO:", cursoNombre.toUpperCase(), "", "PERIODO:", periodo])
      rows.push(["PROGRAMA:", programaNombre.toUpperCase(), "", "FECHA EMISIÓN:", new Date().toLocaleDateString()])
      rows.push(["DOCENTE:", docenteNombre.toUpperCase()])
      rows.push([])
      const head = ["N°", "APELLIDOS Y NOMBRES", "DNI"]
      evaluaciones.forEach(e => head.push(e.titulo))
      head.push("PROMEDIO")
      rows.push(head)
      matriculas.sort((a, b) => a.estudiante_nombre.localeCompare(b.estudiante_nombre)).forEach((m, i) => {
        const row = [(i + 1).toString().padStart(2, '0'), m.estudiante_nombre.toUpperCase(), m.estudiante_dni]
        evaluaciones.forEach(e => row.push(notas[m.estudiante_id]?.[e.titulo] !== undefined ? notas[m.estudiante_id][e.titulo].toString() : "-"))
        const prom = calculatePromedio(m.estudiante_id)
        row.push(prom !== null ? prom.toFixed(2) : "-")
        rows.push(row)
      })
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Recuperacion")
      XLSX.writeFile(wb, `RECUPERACION_${cursoNombre.replace(/\s+/g, '_')}.xlsx`)
    } catch { toast({ variant: "destructive", title: "Error Excel" })
    } finally { setIsExporting(false) }
  }

  const handleExportPdf = () => {
    if (matriculas.length === 0) return
    setIsExporting(true)
    try {
      const doc = new jsPDF('l', 'mm', 'a4')
      doc.setFontSize(16); doc.setTextColor(0, 51, 102); doc.setFont("helvetica", "bold")
      doc.text("INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA", 14, 15)
      doc.setFontSize(9); doc.setTextColor(100); doc.setFont("helvetica", "bold")
      doc.text("REGISTRO AUXILIAR DE RECUPERACIÓN ACADÉMICA", 14, 22)
      doc.setFontSize(8); doc.setTextColor(0); doc.setFont("helvetica", "normal")
      doc.text("CURSO:", 14, 30); doc.setFont("helvetica", "bold"); doc.text(cursoNombre.toUpperCase(), 30, 30)
      doc.setFont("helvetica", "normal"); doc.text("PROGRAMA:", 14, 35); doc.setFont("helvetica", "bold"); doc.text(programaNombre.toUpperCase(), 35, 35)
      doc.setFont("helvetica", "normal"); doc.text("DOCENTE:", 14, 40); doc.setFont("helvetica", "bold"); doc.text(docenteNombre.toUpperCase(), 35, 40)
      doc.setFont("helvetica", "normal"); doc.text("PERIODO:", 230, 30); doc.setFont("helvetica", "bold"); doc.text(periodo, 260, 30)
      doc.setFont("helvetica", "normal"); doc.text("FECHA EMISIÓN:", 230, 35); doc.setFont("helvetica", "bold"); doc.text(new Date().toLocaleDateString(), 270, 35)
      const head = ["N°", "APELLIDOS Y NOMBRES", ...evaluaciones.map(e => e.titulo), "PROMEDIO"]
      const body = matriculas.sort((a, b) => a.estudiante_nombre.localeCompare(b.estudiante_nombre)).map((m, i) => [
        (i + 1).toString().padStart(2, '0'), m.estudiante_nombre.toUpperCase(),
        ...evaluaciones.map(e => notas[m.estudiante_id]?.[e.titulo]?.toString() || "-"),
        (calculatePromedio(m.estudiante_id) ?? "-").toString()
      ])
      autoTable(doc, { startY: 47, head: [head], body, theme: 'grid', styles: { fontSize: 7, halign: 'center' }, headStyles: { fillColor: [0, 51, 102], textColor: 255 }, columnStyles: { 1: { halign: 'left', fontStyle: 'bold', cellWidth: 70 } } })
      doc.save(`RECUPERACION_${cursoNombre.replace(/\s+/g, '_')}.pdf`)
    } catch { toast({ variant: "destructive", title: "Error PDF" })
    } finally { setIsExporting(false) }
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-black uppercase text-xs tracking-widest text-muted-foreground">Cargando Recuperaciones...</p>
      </div>
    )
  }

  return (
    <>
      {/* Fullscreen Projector */}
      {showProjector && (
        <div className="fixed inset-0 z-50 bg-[#6D28D9] overflow-hidden animate-in fade-in duration-500 font-body flex flex-col">
          <div className="h-2 bg-yellow-400 w-full shadow-lg" />
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* LEFT PANEL */}
            <div className="w-full lg:w-[380px] xl:w-[420px] bg-white/10 backdrop-blur-md border-r border-white/10 shadow-2xl z-20 flex flex-col overflow-hidden">
              <ScrollArea className="flex-grow">
                <div className="p-6 lg:p-8 space-y-6 lg:space-y-8 pb-8">
                  <div className="flex items-center gap-4">
                    <Zap className="h-8 w-8 lg:h-10 lg:w-10 text-yellow-400 fill-yellow-400" />
                    <h2 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Arena Live</h2>
                  </div>
                  {/* PIN + QR */}
                  <div className="bg-card p-5 lg:p-6 rounded-[2.5rem] shadow-2xl text-center space-y-4 border-b-8 border-yellow-400 relative overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">CÓDIGO PIN</p>
                    {cursoNombre && (
                      <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 py-1 px-3 rounded-full inline-block">
                        Recuperación: {cursoNombre}
                      </p>
                    )}
                    <h3 className="text-5xl lg:text-6xl font-black text-primary font-mono tracking-tighter leading-none">{roomCode}</h3>
                    <div className="p-3 lg:p-4 bg-muted rounded-[2rem] border-2 border-border shadow-inner">
                      {typeof window !== "undefined" && (
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/student/quiz/join?pin=${roomCode}&curso=${encodeURIComponent(cursoNombre)}&programa=${encodeURIComponent(programaNombre)}`)}`} className="w-24 h-24 lg:w-32 lg:h-32 mix-blend-multiply mx-auto" alt="QR" />
                      )}
                    </div>
                    <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/student/quiz/join?pin=${roomCode}&curso=${encodeURIComponent(cursoNombre)}&programa=${encodeURIComponent(programaNombre)}`); toast({ title: "Enlace copiado" }) }}
                      className="font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary gap-2">
                      <Link className="h-3.5 w-3.5" /> Copiar Enlace
                    </Button>
                  </div>
                  {/* Controls */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-4">
                      <div className="flex flex-col text-white">
                        <span className="text-[10px] font-black uppercase opacity-60 tracking-widest">PARTICIPANTES</span>
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-yellow-400" />
                          <span className="text-3xl lg:text-4xl font-black">{arenaRoom?.participants?.length || 0}</span>
                        </div>
                      </div>
                      {arenaRoom?.status === "active" && (
                        <div className="text-right space-y-1">
                          <span className="text-[10px] font-black uppercase opacity-60 tracking-widest">PREGUNTA</span>
                          <div className="text-xl lg:text-2xl font-black text-white">{arenaRoom.currentQuestionIndex + 1} / {arenaRoom.questions.length}</div>
                          <div className={cn("text-lg font-black font-mono", instructorTimeLeft <= 5 ? "text-red-400 animate-pulse" : "text-yellow-400")}>
                            {instructorTimeLeft}s
                          </div>
                        </div>
                      )}
                    </div>
                    {arenaRoom?.status === "lobby" ? (
                      <Button onClick={handleStartGame} disabled={!arenaRoom?.participants?.length}
                        className="w-full h-16 lg:h-20 bg-yellow-400 text-primary rounded-[2rem] font-black text-lg lg:text-xl shadow-2xl transition-all hover:scale-[1.02] border-b-4 border-yellow-600">
                        INICIAR ARENA
                      </Button>
                    ) : arenaRoom?.status === "active" ? (
                      <div className="space-y-3">
                        <Button onClick={handleNextQuestion}
                          className="w-full h-16 lg:h-20 bg-emerald-500 text-white rounded-[2rem] font-black text-lg lg:text-xl shadow-2xl transition-all hover:scale-[1.02] border-b-4 border-emerald-700 gap-3">
                          <ChevronRight className="h-5 w-5 lg:h-6 lg:w-6" /> SIGUIENTE PREGUNTA
                        </Button>
                        <Button onClick={handleFinishGame} variant="outline"
                          className="w-full h-12 lg:h-14 bg-red-500/10 border-red-500 text-red-500 rounded-[1.5rem] font-black text-sm uppercase tracking-widest">
                          FINALIZAR DESAFÍO
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={async () => { await syncArenaGrades(); setShowProjector(false); setRoomCode(""); resetModal() }}
                        className="w-full h-16 lg:h-20 bg-card text-primary rounded-[2rem] font-black text-lg lg:text-xl shadow-2xl border-b-4 border-border gap-3">
                        <ClipboardCheck className="h-5 w-5 lg:h-6 lg:w-6" /> SINCRONIZAR NOTAS
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => { setShowProjector(false); setRoomCode("") }}
                      className="w-full h-10 text-[10px] font-bold uppercase text-white/40 hover:text-white tracking-widest mt-4">
                      Salir de Proyección
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
            {/* RIGHT PANEL */}
            <div className="flex-grow p-6 lg:p-10 bg-[#6D28D9] overflow-y-auto relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.05)_2px,transparent_0)] bg-[size:64px_64px]" />
              {arenaRoom?.status === "active" && (
                <div className="relative z-10 mb-8 bg-white/10 backdrop-blur-md rounded-[2rem] p-8 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="bg-yellow-400 text-primary font-black text-sm px-4 py-2 rounded-xl">
                        #{arenaRoom.currentQuestionIndex + 1}
                      </span>
                      <span className="text-white/60 font-black text-[10px] uppercase tracking-widest">
                        de {arenaRoom.questions.length} preguntas
                      </span>
                    </div>
                    <div className={cn("flex items-center gap-2 font-black font-mono text-2xl", instructorTimeLeft <= 5 ? "text-red-400 animate-pulse" : "text-yellow-400")}>
                      <Clock className="h-6 w-6" /> {instructorTimeLeft}s
                    </div>
                  </div>
                  <p className="text-white font-bold text-xl uppercase tracking-tight leading-snug">
                    {arenaRoom.questions[arenaRoom.currentQuestionIndex]?.text}
                  </p>
                  <div className="flex items-center gap-4 text-white/60 text-[10px] font-black uppercase tracking-widest">
                    <span><Users className="h-4 w-4 inline mr-1" /> {arenaRoom.participants.length} participantes</span>
                    <span className="text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 inline mr-1" />
                      {arenaRoom.participants.filter((p: any) => p.answers?.some((a: any) => a.questionIndex === arenaRoom.currentQuestionIndex)).length} respondieron
                    </span>
                  </div>
                </div>
              )}
              {!arenaRoom ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-10 w-10 animate-spin text-white/60" />
                </div>
              ) : arenaRoom.status === "lobby" ? (
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 relative z-10">
                  {arenaRoom.participants.map((p: any) => (
                    <Card key={p._id} className="flex flex-col items-center gap-3 p-4 rounded-[2rem] border-4 border-transparent transition-all group relative bg-card shadow-xl hover:border-yellow-400/30">
                      <Avatar className="h-14 w-14 border-2 border-white shadow-lg group-hover:scale-110 transition-transform shrink-0 relative z-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(p.avatar)}`} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-black text-lg">{getInitials(p.name)}</AvatarFallback>
                      </Avatar>
                      <div className="text-center space-y-1 w-full overflow-hidden relative z-10">
                        <p className="text-[10px] font-black text-foreground truncate w-full uppercase italic tracking-tighter">{p.name.split(",")[0]}</p>
                        <div className="bg-primary/5 rounded-lg py-1 px-3 inline-block border border-primary/5">
                          <p className="text-sm font-black text-primary leading-none font-mono">0</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {!arenaRoom.participants.length && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-white/40">
                      <Zap className="h-24 w-24 mb-6 opacity-30" />
                      <p className="text-2xl font-black uppercase tracking-tighter italic">Esperando participantes...</p>
                      <p className="text-sm mt-2 opacity-60">Comparte el PIN o QR con los alumnos</p>
                    </div>
                  )}
                </div>
              ) : arenaRoom.status === "active" ? (
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-4 relative z-10">
                  {arenaRoom.participants.map((p: any) => {
                    const answered = p.answers?.some((a: any) => a.questionIndex === arenaRoom.currentQuestionIndex)
                    return (
                      <Card key={p._id} className={cn("flex flex-col items-center gap-3 p-4 rounded-[2rem] border-4 transition-all group relative bg-card shadow-xl",
                        p.isCheating ? "border-red-500 animate-pulse bg-red-50" : answered ? "border-emerald-400 bg-emerald-50/50" : "border-transparent")}>
                        {p.isCheating && (
                          <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded-lg z-20 shadow-2xl border-2 border-white">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-[8px] font-black uppercase tracking-widest">FRAUDE</span>
                          </div>
                        )}
                        <Avatar className="h-14 w-14 border-2 border-white shadow-lg group-hover:scale-110 transition-transform shrink-0 relative z-10">
                          <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(p.avatar)}`} />
                          <AvatarFallback className={cn("text-lg font-black uppercase", p.isCheating ? "bg-red-200 text-red-800" : "bg-gradient-to-br from-purple-400 to-pink-400 text-white")}>
                            {getInitials(p.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center space-y-1 w-full overflow-hidden relative z-10">
                          <p className="text-[10px] font-black text-foreground truncate w-full uppercase italic tracking-tighter">{p.name.split(",")[0]}</p>
                          <div className="bg-primary/5 rounded-lg py-1 px-3 inline-block border border-primary/5">
                            <p className="text-sm font-black text-primary leading-none font-mono">{p.score}</p>
                          </div>
                        </div>
                        {answered && <CheckCircle2 className="h-5 w-5 text-emerald-500 absolute top-2 left-2" />}
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <Trophy className="h-32 w-32 text-yellow-400 animate-bounce mb-8" />
                  <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter text-center leading-none drop-shadow-[0_20px_20px_rgba(0,0,0,0.4)]">¡PODIO DE<br />CAMPEONES!</h2>
                  <p className="mt-6 text-yellow-400 font-black text-xl uppercase tracking-[0.5em] animate-pulse">Revelando Ganadores...</p>
                  <div className="mt-12 w-full max-w-2xl space-y-4">
                    {[...arenaRoom.participants]
                      .sort((a: any, b: any) => b.score - a.score)
                      .slice(0, 10)
                      .map((p: any, i: number) => {
                        const correctas = p.answers?.filter((a: any) => a.isCorrect).length || 0
                        const nota = Math.round((correctas / arenaRoom.questions.length) * 20 * 100) / 100
                        return (
                          <div key={p._id} className={cn("flex items-center justify-between px-8 py-5 rounded-[2rem] border-4 shadow-2xl transition-all duration-700",
                            i === 0 ? "bg-yellow-100 border-yellow-400 scale-105" : i === 1 ? "bg-slate-100 border-slate-300" : i === 2 ? "bg-orange-100 border-orange-400" : "bg-card/80 border-white/20")}>
                            <div className="flex items-center gap-4">
                              {i === 0 ? <Crown className="h-8 w-8 text-yellow-500" /> : <span className="text-2xl font-black text-muted-foreground w-8 text-center">#{i + 1}</span>}
                              <Avatar className="h-14 w-14 border-4 border-white shadow-xl">
                                <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(p.avatar)}`} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-black text-sm">{getInitials(p.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-black text-lg">{p.name}</p>
                                <p className="text-sm text-muted-foreground">{correctas}/{arenaRoom.questions.length} correctas · {p.score} pts</p>
                              </div>
                            </div>
                            <span className={cn("text-4xl font-black font-mono", nota >= 13 ? "text-emerald-600" : "text-red-500")}>{nota.toFixed(1)}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rank-UP Arena Preview */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-white overflow-hidden animate-in fade-in duration-300 flex flex-col">
          <div className="flex items-center justify-between px-8 py-6 border-b bg-card shrink-0">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => { setShowPreview(false); setQuizPreguntas([]); setRoomCode("") }} className="h-12 w-12 rounded-2xl border-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <Zap className="h-6 w-6 text-purple-500 fill-purple-500" /> Rank-UP Arena
                </h2>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{newTitulo}</p>
              </div>
            </div>
          </div>
          <div className="flex-grow flex overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto space-y-6">
                {(quizPreguntas || []).map((q, idx) => (
                  <div key={idx} className="p-8 bg-muted/30 rounded-[2.5rem] border-2 border-border space-y-6 group hover:bg-card transition-all">
                    <div className="flex justify-between items-start">
                      <Badge className="bg-primary text-white font-black text-[9px] px-5 py-1 rounded-full uppercase tracking-[0.3em]">ITEM {idx + 1}</Badge>
                      <div className="bg-card p-3 rounded-2xl border-2 border-border shadow-sm shrink-0 flex flex-col items-center">
                        <Clock className="h-4 w-4 text-primary mb-0.5" />
                        <span className="font-black text-lg text-foreground">{tiempoLimite}s</span>
                      </div>
                    </div>
                    <p className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight max-w-2xl">{q.text}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(q.options || []).map((opt: string, oIdx: number) => (
                        <div key={oIdx} className={cn("p-3.5 rounded-2xl border-2 flex items-center gap-3 font-bold text-sm transition-all",
                          q.correctIndex === oIdx ? "bg-emerald-50 border-emerald-400 text-emerald-800" : "bg-card border-border text-foreground/90")}>
                          <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0",
                            q.correctIndex === oIdx ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>{String.fromCharCode(65 + oIdx)}</span>
                          <span className="text-xs font-semibold leading-tight">{opt}</span>
                          {q.correctIndex === oIdx && <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-80 border-l bg-card p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
              <div className="space-y-1">
                <h3 className="font-black text-xs uppercase text-muted-foreground tracking-[0.2em]">Datos de la Actividad</h3>
                <p className="font-bold text-sm truncate">{newTitulo || "Sin título"}</p>
              </div>
              <div className="bg-card p-4 rounded-2xl border border-border flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600"><Clock className="h-4 w-4" /></div>
                <div className="flex flex-col flex-1">
                  <span className="text-[8px] font-black text-muted-foreground uppercase">Tiempo por pregunta</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Input type="number" min={5} max={180} value={tiempoLimite}
                      onChange={e => setTiempoLimite(Math.max(5, Math.min(180, parseInt(e.target.value) || 5)))}
                      className="w-16 h-8 text-center font-black text-sm bg-card border-2 border-border rounded-xl outline-none focus:border-amber-400" />
                    <span className="text-sm font-black text-foreground">seg</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={handleExportQuestionsPdf} variant="outline"
                  className="h-14 rounded-2xl font-black uppercase text-xs border-red-200 text-red-600 hover:bg-red-50 gap-3">
                  <FileText className="h-5 w-5" /> Exportar Banco PDF
                </Button>
                <Button onClick={handleAbrirArena} disabled={quizPreguntas.length === 0}
                  className="h-16 rounded-[2rem] bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-black uppercase text-sm tracking-widest shadow-2xl gap-3 transition-all active:scale-95">
                  <Play className="h-5 w-5" /> LANZAR ARENA
                </Button>
              </div>
              <div className="mt-auto pt-4 border-t text-center">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{quizPreguntas.length} preguntas · {tiempoLimite}s c/u</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content (table) */}
      {!showPreview && !showProjector && (
        <div className="space-y-6 md:space-y-10 pb-20">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
            <div className="space-y-4 w-full lg:w-auto">
              <button onClick={() => router.back()} className="flex items-center text-primary font-bold hover:opacity-70 transition-opacity uppercase tracking-widest text-[10px]">
                <ArrowLeft className="mr-2 h-4 w-4" /> VOLVER AL PANEL
              </button>
              <div className="flex items-center gap-4">
                <div className="p-3 md:p-4 bg-amber-500 rounded-2xl md:rounded-3xl text-white shadow-2xl shadow-amber-500/20">
                  <ClipboardCheck className="h-8 w-8 md:h-10 md:w-10" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-4xl font-headline font-black tracking-tight text-foreground">{cursoNombre}</h2>
                  <p className="text-xs md:text-sm text-muted-foreground font-medium italic">{programaNombre} &middot; {periodo}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <Button variant="outline" disabled={isExporting} onClick={handleExportExcel}
                className="flex-1 lg:flex-none h-12 md:h-14 px-4 md:px-6 gap-2 md:gap-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-black rounded-xl md:rounded-2xl uppercase text-[10px] md:text-[11px] tracking-widest">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 md:h-5 md:h-5" />} Excel
              </Button>
              <Button variant="outline" disabled={isExporting} onClick={handleExportPdf}
                className="flex-1 lg:flex-none h-12 md:h-14 px-4 md:px-6 gap-2 md:gap-3 border-red-200 text-red-700 hover:bg-red-50 font-black rounded-xl md:rounded-2xl uppercase text-[10px] md:text-[11px] tracking-widest">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 md:h-5 md:h-5" />} PDF
              </Button>
              <Button onClick={() => { setEvalStep(0); setEvalType(null); setNewTitulo(""); setDocxFile(null); setQuizPreguntas([]); setShowPreview(false); setEvalDialog(true) }}
                className="h-12 md:h-14 px-8 gap-2 md:gap-3 bg-amber-500 hover:bg-amber-600 font-black shadow-xl shadow-amber-500/30 rounded-xl md:rounded-2xl uppercase text-[10px] md:text-[11px] tracking-widest text-white">
                <Plus className="h-4 w-4 md:h-5 md:h-5" /> Nueva Evaluación
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-2xl overflow-hidden bg-card rounded-2xl md:rounded-[2.5rem]">
                <div className="p-4 md:p-8 bg-muted/30 border-b flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                  <div className="relative w-full md:w-[450px]">
                    <svg className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <Input placeholder="Buscar alumno por nombre o DNI..."
                      className="pl-10 md:pl-14 h-12 md:h-14 border-none shadow-inner rounded-xl md:rounded-2xl bg-background font-medium text-sm md:text-base text-foreground"
                      value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground/70 tracking-widest">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Sincronización Automática Activa
                  </div>
                </div>
                <CardContent className="p-0 overflow-hidden">
                  {matriculas.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground">
                      <ClipboardCheck className="h-16 w-16 mx-auto mb-4 text-amber-300" />
                      <p className="font-semibold text-lg">No hay alumnos matriculados</p>
                      <p className="text-sm">Asigna alumnos desde el panel de administración</p>
                    </div>
                  ) : (
                    <ScrollArea className="w-full">
                      <div className="min-w-full inline-block align-middle">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-none bg-muted/30">
                                <TableHead className="pl-6 md:pl-10 w-[250px] md:w-[350px] font-black text-[10px] uppercase text-muted-foreground tracking-widest py-4 md:py-6 sticky left-0 z-30 bg-muted backdrop-blur-sm border-r">Alumno</TableHead>
                                {evaluaciones.map(ev => (
                                  <TableHead key={ev.titulo} className="text-center font-black text-[10px] uppercase text-muted-foreground tracking-widest px-4 md:px-6 border-l min-w-[120px]">
                                    <div className="flex items-center gap-1 justify-center">
                                      <span className="text-foreground truncate w-20 md:w-28 font-extrabold text-[11px]">{ev.titulo}</span>
                                      {titlesWithQuiz.has(ev.titulo) && (
                                        <button onClick={() => handleLaunchArena(ev.titulo)}
                                          className="h-6 w-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform shrink-0">
                                          <Play className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                    <button onClick={() => setDeleteTargetTitulo(ev.titulo)} className="mt-1 h-5 w-5 rounded-full hover:bg-destructive/10 text-destructive inline-flex items-center justify-center"><Trash2 className="h-3 w-3" /></button>
                                  </TableHead>
                                ))}
                                <TableHead className="text-center font-black text-[10px] uppercase text-primary tracking-widest w-[100px] border-l sticky right-0 z-30 bg-muted backdrop-blur-sm">Promedio</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredStudents.map(m => {
                                const prom = calculatePromedio(m.estudiante_id)
                                return (
                                  <TableRow key={m.id} className="hover:bg-muted transition-all border-b">
                                    <TableCell className="pl-6 md:pl-10 sticky left-0 z-20 bg-card border-r">
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 border-2 border-border shadow-sm">
                                          <AvatarFallback className="bg-amber-500/10 text-amber-600 font-black text-[10px]">{getInitials(m.estudiante_nombre)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <span className="font-bold text-xs text-foreground uppercase truncate w-32 md:w-48 block">{m.estudiante_nombre}</span>
                                          <span className="text-[8px] text-muted-foreground font-mono">DNI: {m.estudiante_dni}</span>
                                        </div>
                                      </div>
                                    </TableCell>
                                    {evaluaciones.map(ev => {
                                      const val = notas[m.estudiante_id]?.[ev.titulo]
                                      return (
                                        <TableCell key={ev.titulo} className="px-4 md:px-6 text-center">
                                          <div className="flex items-center justify-center gap-1.5">
                                            <Input type="number" placeholder="-"
                                              className={cn("w-16 h-8 text-center font-bold text-xs border-none shadow-inner rounded-lg",
                                                val !== undefined && val < 13 ? "text-red-600 bg-red-50" : val !== undefined ? "text-emerald-700 bg-emerald-50" : "")}
                                              value={val === undefined ? "" : val}
                                              onChange={e => handleGradeChange(m.id, m.estudiante_id, ev.titulo, e.target.value)} />
                                          </div>
                                        </TableCell>
                                      )
                                    })}
                                    <TableCell className="border-l sticky right-0 z-20 bg-primary/5 text-center">
                                      <span className={cn("text-base font-black font-mono", prom !== null && prom < 13 ? "text-red-600" : "text-primary")}>
                                        {prom !== null ? prom.toFixed(2) : "--"}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Confirmar eliminación */}
          <AlertDialog open={!!deleteTargetTitulo} onOpenChange={() => setDeleteTargetTitulo(null)}>
            <AlertDialogContent className="rounded-[2rem] max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-black uppercase tracking-tighter">Eliminar evaluación</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium">
                  ¿Estás seguro de eliminar <strong className="text-foreground">{deleteTargetTitulo}</strong>?
                  Se borrarán las notas y el quiz asociado para todos los alumnos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl font-black text-[10px] uppercase tracking-widest">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => { if (deleteTargetTitulo) handleDeleteEval(deleteTargetTitulo); setDeleteTargetTitulo(null) }}
                  className="rounded-xl bg-red-600 hover:bg-red-700 font-black text-[10px] uppercase tracking-widest gap-2">
                  <Trash2 className="h-4 w-4" /> Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Evaluacion Modal */}
          {evalDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-amber-500/30 rounded-[2.5rem]">
                <div className="p-6 md:p-8 bg-amber-500 text-white space-y-2 shrink-0 rounded-t-[2.5rem]">
                  {evalStep === 0 ? (
                    <>
                      <Badge className="bg-white/20 text-white font-black uppercase text-[9px] md:text-[10px]">Paso 1 de 2</Badge>
                      <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter">Tipo de Evaluación</h3>
                      <p className="text-amber-100/80 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">{cursoNombre}</p>
                    </>
                  ) : (
                    <>
                      <Badge className="bg-white/20 text-white font-black uppercase text-[9px] md:text-[10px]">{evalType === "directa" ? "Nota Directa" : "Gamificación"}</Badge>
                      <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter">Configurar Evaluación</h3>
                      <p className="text-amber-100/80 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">{cursoNombre}</p>
                    </>
                  )}
                </div>
                <div className="p-6 md:p-8">
                  {evalStep === 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => { setEvalType("directa"); setEvalStep(1) }} className="h-auto p-8 flex-col gap-4 rounded-[2rem] border-2 border-slate-100 hover:border-amber-500/40 hover:bg-amber-50/30 transition-all text-center">
                        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto"><GraduationCap className="h-8 w-8" /></div>
                        <p className="font-black text-sm uppercase tracking-wider">Nota Directa</p>
                        <p className="text-xs text-muted-foreground">Genera examen en PDF para imprimir</p>
                      </button>
                      <button onClick={() => { setEvalType("gamificacion"); setEvalStep(1) }} className="h-auto p-8 flex-col gap-4 rounded-[2rem] border-2 border-slate-100 hover:border-purple-500/40 hover:bg-purple-50/30 transition-all text-center">
                        <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto"><Sparkles className="h-8 w-8" /></div>
                        <p className="font-black text-sm uppercase tracking-wider">Gamificación</p>
                        <p className="text-xs text-muted-foreground">Arena en vivo con Convex + PIN</p>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <Label className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] ml-1">Título de la Evaluación</Label>
                        <Input value={newTitulo} onChange={e => setNewTitulo(e.target.value)} placeholder={evalType === "directa" ? "Ej: Examen de recuperación - Matemática" : "Ej: Quiz gamificado - Comunicación"} className="h-12 border-none shadow-inner rounded-xl bg-white" />
                      </div>
                      {evalType === "gamificacion" && quizPreguntas.length === 0 && (
                        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <Clock className="h-5 w-5 text-slate-400 shrink-0" />
                          <Label className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] shrink-0">Tiempo por pregunta</Label>
                          <Input type="number" min={5} max={120} value={tiempoLimite} onChange={e => setTiempoLimite(parseInt(e.target.value) || 60)} className="w-20 h-10 rounded-xl text-center font-black bg-white border-2 border-slate-200 shadow-none" />
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">SEG</span>
                        </div>
                      )}
                      {quizPreguntas.length === 0 ? (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <Label className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] ml-1">Sube el material (.docx o .pdf)</Label>
                            <div onClick={() => document.getElementById("docx-upload")?.click()} className="mt-1 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-amber-400/50 transition-colors bg-white">
                              {docxFile ? (<div className="flex items-center justify-center gap-3"><BookOpen className="h-6 w-6 text-amber-500" /><span className="font-medium">{docxFile.name}</span></div>) : (<><Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" /><p className="font-medium">Haz clic para subir</p><p className="text-xs text-muted-foreground">Archivos .docx o .pdf</p></>)}
                            </div>
                            <input id="docx-upload" type="file" accept=".docx,.pdf" className="hidden" onChange={e => setDocxFile(e.target.files?.[0] || null)} />
                          </div>
                          <Button onClick={handleGenerate} disabled={generating || !docxFile || !newTitulo} className="w-full h-12 rounded-xl gap-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-black uppercase text-xs tracking-widest shadow-lg">
                            {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando 20 preguntas...</> : <><Sparkles className="h-4 w-4" /> Generar 20 preguntas con IA</>}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /> {quizPreguntas.length} preguntas generadas</h4>
                            <Badge variant="outline" className="text-[10px]">{evalType === "directa" ? "Examen imprimible" : `Arena en vivo · ${tiempoLimite}s`}</Badge>
                          </div>
                          <ScrollArea className="h-72 rounded-xl border bg-muted/20 p-3">
                            <div className="space-y-3 pr-4">
                              {quizPreguntas.map((q, i) => (
                                <div key={i} className="p-3 rounded-xl border bg-card">
                                  <p className="font-semibold text-xs mb-1">{i + 1}. {q.text}</p>
                                  <div className="grid grid-cols-2 gap-1">
                                    {q.options.map((o, j) => (<span key={j} className={"text-[10px] px-2 py-0.5 rounded " + (j === q.correctIndex ? "bg-green-100 text-green-700 font-medium" : "text-muted-foreground")}>{String.fromCharCode(65 + j)}. {o}</span>))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                          <div className="flex justify-end gap-2 pt-2">
                            {(!quizGuardadoId || (newTitulo !== quizGuardadoTitulo)) && (
                              <Button onClick={handleSaveEvaluacion} className="h-12 font-black uppercase text-xs shadow-lg gap-2 px-8 rounded-xl" style={{ background: evalType === "directa" ? "oklch(0.7 0.15 80)" : "linear-gradient(to right, #9333ea, #ec4899)", color: "white" }}>
                                <Save className="h-4 w-4" /> Guardar
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-6 flex justify-end">
                    <Button variant="ghost" onClick={resetModal} className="font-black text-slate-400 uppercase text-[10px] px-8 h-12 rounded-xl border-2">Cancelar</Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )
    }


export default function RecoveryNotasPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <RecoveryNotasContent />
    </Suspense>
  )
}
