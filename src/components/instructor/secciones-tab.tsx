"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Sparkles, Download, Clock, FileText, BookOpen, GraduationCap, ChevronRight, RefreshCw, Upload, CheckCircle2 } from "lucide-react"
import { generateSesion, type GenerateSesionOutput, type GenerateSesionInput } from "@/ai/flows/generate-sesion-flow"
import { DocxModifier } from "@/lib/docx-modifier"
import { api } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

const emptyForm: GenerateSesionInput = {
  programaEstudios: "",
  moduloFormativo: "",
  unidadCompetencia: "",
  unidadDidactica: "",
  capacidad: "",
  indicadorLogro: "",
  competenciaTransversal: "",
  periodoLectivo: "",
  periodoAcademico: "",
  fechaDesarrollo: new Date().toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" }),
  docente: "",
  sesion: "",
  logro: "",
  contenidos: "",
  lugarTipo: "Aula",
  horasTeoricas: "2",
  horasPracticas: "12",
  distribucionActividades: "",
}

type FormKey = keyof GenerateSesionInput

interface SectionField {
  key: FormKey
  label: string
  placeholder: string
  type?: "textarea"
}

interface FormSection {
  title: string
  fields: SectionField[]
}

const sections: FormSection[] = [
  {
    title: "Programa y Módulo",
    fields: [
      { key: "programaEstudios" as const, label: "Programa de estudios", placeholder: "Ej: Desarrollo de sistemas de información" },
      { key: "moduloFormativo" as const, label: "Módulo formativo", placeholder: "Ej: I. Programación de Sistemas Informáticos" },
      { key: "unidadCompetencia" as const, label: "Unidad de competencia vinculada", type: "textarea", placeholder: "Ej: UC1. Desarrollar la construcción de programas..." },
    ]
  },
  {
    title: "Unidad y Capacidad",
    fields: [
      { key: "unidadDidactica" as const, label: "Unidad didáctica", placeholder: "Ej: Lógica de programación" },
      { key: "capacidad" as const, label: "Capacidad", type: "textarea", placeholder: "Ej: UC1.C1 Construir programas de manera coherente..." },
      { key: "indicadorLogro" as const, label: "Indicador de logro vinculado", type: "textarea", placeholder: "Ej: C1.I4 Implementa algoritmos básicos..." },
      { key: "competenciaTransversal" as const, label: "Competencia transversal priorizada", type: "textarea", placeholder: "Ej: Trabajo Colaborativo (T): Participar de forma activa..." },
    ]
  },
  {
    title: "Periodo y Fechas",
    fields: [
      { key: "periodoLectivo" as const, label: "Periodo lectivo", placeholder: "Ej: 2026 – I" },
      { key: "periodoAcademico" as const, label: "Periodo académico", placeholder: "Ej: I" },
      { key: "fechaDesarrollo" as const, label: "Fecha de desarrollo", placeholder: "Ej: 01 al 12 Junio" },
      { key: "docente" as const, label: "Docente responsable", placeholder: "Ej: Bach. Rodolfo Riveros Mitma" },
    ]
  },
  {
    title: "Sesión de Aprendizaje",
    fields: [
      { key: "sesion" as const, label: "Sesión de aprendizaje", placeholder: "Ej: 7. JavaScript Básico – Sintaxis, Variables y Operadores" },
      { key: "logro" as const, label: "Logro o propósito de la sesión", type: "textarea", placeholder: "Ej: Traslada algoritmos diseñados en pseudocódigo a JavaScript..." },
      { key: "contenidos" as const, label: "Contenidos", type: "textarea", placeholder: "Ej: ¿Qué es JavaScript y dónde se usa?\nVariables: let y const\nTipos de datos básicos..." },
    ]
  },
  {
    title: "Logística",
    fields: [
      { key: "lugarTipo" as const, label: "Lugar y tipo de sesión", placeholder: "Ej: Aula" },
      { key: "horasTeoricas" as const, label: "Horas teóricas", placeholder: "2" },
      { key: "horasPracticas" as const, label: "Horas prácticas", placeholder: "12" },
    ]
  },
]

export function SeccionesTab() {
  const [asignaciones, setAsignaciones] = React.useState<any[]>([])
  const [selectedAsgId, setSelectedAsgId] = React.useState<string>("")
  const [periodos, setPeriodos] = React.useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = React.useState(true)
  const [form, setForm] = React.useState<GenerateSesionInput>(emptyForm)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isProcessingDocx, setIsProcessingDocx] = React.useState(false)
  const [loadingText, setLoadingText] = React.useState("")
  const [result, setResult] = React.useState<GenerateSesionOutput | null>(null)
  const [docxBlob, setDocxBlob] = React.useState<Blob | null>(null)
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [indicators, setIndicators] = React.useState<any[]>([])
  const [selectedIndicatorId, setSelectedIndicatorId] = React.useState<string>("")
  const [dateStart, setDateStart] = React.useState("")
  const [dateEnd, setDateEnd] = React.useState("")
  const [templateFile, setTemplateFile] = React.useState<ArrayBuffer | null>(null)
  const [templateFileName, setTemplateFileName] = React.useState("")
  const [step, setStep] = React.useState(0)
  const [placeholders, setPlaceholders] = React.useState<string[]>([])
  const [placeholderValues, setPlaceholderValues] = React.useState<Record<string, string>>({})
  const [actividadHours, setActividadHours] = React.useState<number[]>([2, 4, 2, 2, 2, 2])

  React.useEffect(() => {
    const saved = localStorage.getItem('sesion-template-buffer')
    const savedName = localStorage.getItem('sesion-template-name')
    if (saved && savedName) {
      const buf = Uint8Array.from(atob(saved), c => c.charCodeAt(0)).buffer
      setTemplateFile(buf)
      setTemplateFileName(savedName)
      setStep(1)
    }
  }, [])

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.docx')) {
      toast({ variant: "destructive", title: "Formato incorrecto", description: "Debe ser un archivo .docx" })
      return
    }
    const buffer = await file.arrayBuffer()
    setTemplateFile(buffer)
    setTemplateFileName(file.name)

    try {
      const mod = new DocxModifier(buffer)
      const detected = mod.obtenerPlaceholders()
      setPlaceholders(detected)
      const vals: Record<string, string> = {}
      detected.forEach(p => { vals[p] = "" })
      setPlaceholderValues(vals)
    } catch { setPlaceholders([]) }

    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    localStorage.setItem('sesion-template-buffer', btoa(binary))
    localStorage.setItem('sesion-template-name', file.name)
    setStep(1)
    toast({ title: "Plantilla cargada", description: `"${file.name}" guardada. No necesitas volver a subirla.` })
  }

  const handleRemoveTemplate = () => {
    localStorage.removeItem('sesion-template-buffer')
    localStorage.removeItem('sesion-template-name')
    setTemplateFile(null)
    setTemplateFileName("")
    setStep(0)
    toast({ title: "Plantilla eliminada" })
  }

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [asgData, periodData, { data: { user } }] = await Promise.all([
          api.get<any[]>('/me/asignaciones/'),
          api.get<any[]>('/periodos/'),
          supabase.auth.getUser(),
        ])
        setAsignaciones(asgData)
        setPeriodos(periodData)
        if (user?.user_metadata) {
          const name = `${user.user_metadata.firstname || ""} ${user.user_metadata.lastname || ""}`.trim()
          setForm(prev => ({ ...prev, docente: `Bach. ${name}` }))
        }
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos del docente" })
      } finally {
        setIsLoadingData(false)
      }
    }
    loadData()
  }, [])

  const handleSelectCourse = async (asgId: string) => {
    setSelectedAsgId(asgId)
    setSelectedIndicatorId("")
    const asg = asignaciones.find(a => a.id === asgId)
    if (!asg) return

    const activePeriod = periodos.find(p => p.es_activo)
    const periodoId = asg.periodo_id || activePeriod?.id || ""

    let fetched: any[] = []
    try {
      fetched = await api.get<any[]>(`/evaluaciones/indicadores/${asg.unidad_id}/${periodoId}`)
    } catch {}
    setIndicators(fetched)

    const today = new Date()
    const weekLater = new Date(today)
    weekLater.setDate(weekLater.getDate() + 12)

    setForm({
      programaEstudios: asg.programa_nombre || "",
      moduloFormativo: "",
      unidadCompetencia: "",
      unidadDidactica: asg.unidad_nombre || "",
      capacidad: "",
      indicadorLogro: "",
      competenciaTransversal: "",
      periodoLectivo: `${activePeriod?.nombre || ""} - ${asg.semestre || ""}`,
      periodoAcademico: asg.semestre || "",
      fechaDesarrollo: "",
      docente: form.docente,
      sesion: "",
      logro: "",
      contenidos: "",
      lugarTipo: "Aula",
      horasTeoricas: "2",
      horasPracticas: "12",
      distribucionActividades: "",
    })
    setDateStart(today.toISOString().split("T")[0])
    setDateEnd(weekLater.toISOString().split("T")[0])
    setIsLoaded(true)
    setStep(2)
    toast({ title: "Plantilla cargada", description: `Datos de "${asg.unidad_nombre}" precargados. Revisa y completa los campos faltantes.` })
  }

  const updateField = (key: keyof GenerateSesionInput, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleGenerate = async () => {
    if (!selectedIndicatorId && indicators.length > 0) {
      toast({ variant: "destructive", title: "Indicador requerido", description: "Selecciona un indicador de logro." })
      return
    }
    if (!dateStart || !dateEnd) {
      toast({ variant: "destructive", title: "Fechas requeridas", description: "Completa el rango de fecha de desarrollo." })
      return
    }

    const selectedInd = indicators.find(i => i.id === selectedIndicatorId)
    const distribucionStr = actividadHours.map((h, i) => `Actividad ${i + 1}: ${h}h`).join(', ')
    const payload: GenerateSesionInput = {
      ...form,
      indicadorLogro: selectedInd ? `${selectedInd.codigo} ${selectedInd.descripcion}` : form.indicadorLogro,
      fechaDesarrollo: new Date(dateStart).toLocaleDateString("es-PE", { day: "numeric", month: "long" }) + " al " + new Date(dateEnd).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }),
      distribucionActividades: distribucionStr,
    }

    setIsGenerating(true)
    setLoadingText("Generando contenido con IA...")
    setResult(null)
    setDocxBlob(null)
    try {
      const output = await generateSesion(payload)
      setResult(output)

      if (!templateFile) {
        toast({ variant: "destructive", title: "Sin plantilla", description: "Debes subir una plantilla .docx primero." })
        return
      }

      setIsProcessingDocx(true)
      setLoadingText("Insertando contenido en la plantilla DOCX...")

      const mod = new DocxModifier(templateFile)
      mod.aplicarDatosIA(formWithDates(output), output)
      const blob = await mod.guardar("blob") as Blob

      setDocxBlob(blob)
      downloadBlob(blob, `ficha-${form.sesion.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.docx`)
      toast({ title: "Ficha generada y descargada", description: "La plantilla se ha llenado con los datos generados por IA." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsGenerating(false)
      setIsProcessingDocx(false)
      setLoadingText("")
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const formWithDates = (output: GenerateSesionOutput) => {
    const selInd = indicators.find(i => i.id === selectedIndicatorId)
    return {
      ...form,
      indicadorLogro: selInd ? `${selInd.codigo} ${selInd.descripcion}` : form.indicadorLogro,
      fechaDesarrollo: new Date(dateStart).toLocaleDateString("es-PE", { day: "numeric", month: "long" }) + " al " + new Date(dateEnd).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }),
      titulo: output.titulo,
    }
  }

  const handleDownloadDocx = async () => {
    if (docxBlob) {
      downloadBlob(docxBlob, `ficha-${form.sesion.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.docx`)
      return
    }
    toast({ variant: "destructive", title: "Sin ficha", description: "Primero genera la ficha con IA." })
  }

  if (isLoadingData) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-muted-foreground gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-bold uppercase text-xs tracking-widest">Cargando datos del docente...</p>
      </div>
    )
  }

  const steps = [
    { icon: Upload, label: "Plantilla" },
    { icon: BookOpen, label: "Curso" },
    { icon: FileText, label: "Formulario" },
    { icon: Clock, label: "Distribución" },
    { icon: Download, label: "Descargar" },
  ]

  return (
    <div className="space-y-8">

      {/* ── Timeline ── */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <button
              onClick={() => { if (i <= step) setStep(i) }}
              disabled={i > step}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all ${
                i === step
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                  : i < step
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                i === step
                  ? 'bg-white/20'
                  : i < step
                    ? 'bg-primary/20'
                    : 'bg-muted-foreground/10'
              }`}>
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span className="font-black text-xs uppercase tracking-wider">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded-full ${i < step ? 'bg-primary/40' : 'bg-muted-foreground/10'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 0: Plantilla ── */}
      {step === 0 && (
        <Card className="border border-border/60 bg-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border/60 px-8 py-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-black text-foreground uppercase tracking-tight">Cargar Plantilla</CardTitle>
                <p className="text-sm text-muted-foreground">Sube tu plantilla .docx institucional. Se guardará automáticamente.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="max-w-xl mx-auto space-y-6">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Selecciona tu archivo .docx</Label>
              <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => document.getElementById('template-upload')?.click()}>
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="font-bold text-sm text-muted-foreground">Haz clic para subir o arrastra tu plantilla aquí</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Solo archivos .docx</p>
                <input id="template-upload" type="file" accept=".docx" className="hidden" onChange={handleTemplateUpload} />
              </div>
              {templateFile && placeholders.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                  <Separator />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2"><FileText className="h-3.5 w-3.5" />Placeholders detectados en la plantilla</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {placeholders.map(p => (
                        <div key={p} className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-3 py-2">
                          <code className="text-[10px] font-mono text-primary shrink-0 min-w-[fit-content]">{`{{${p}}}`}</code>
                          <input
                            value={placeholderValues[p] ?? ""}
                            onChange={e => setPlaceholderValues(prev => ({ ...prev, [p]: e.target.value }))}
                            placeholder="Valor opcional..."
                            className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground/40"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-muted/50 border border-border rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
                <p className="font-bold mb-1">Placeholders disponibles:</p>
                <code className="text-[10px]">programaEstudios, moduloFormativo, unidadDidactica, docente, sesion, logroFinal, contenidos, actividad1Titulo, actividad1Duracion, actividad1InicioEstrategia, actividad1InicioMotivacion, actividad1InicioSaberes, actividad1InicioConflicto, actividad1DesarrolloEstrategia, actividad1DesarrolloConstruccion, actividad1DesarrolloContenido, actividad1DesarrolloEjercicios, actividad1CierreMetacognicion, actividad1CierreEvaluacion, actividad1CierreInstrumento, actividad1Recursos, actividad2Titulo, actividad2Duracion, actividad2InicioEstrategia, actividad2InicioMotivacion, actividad2InicioSaberes, actividad2InicioConflicto, actividad2DesarrolloEstrategia, actividad2DesarrolloConstruccion, actividad2DesarrolloContenido, actividad2DesarrolloEjercicios, actividad2CierreMetacognicion, actividad2CierreEvaluacion, actividad2CierreInstrumento, actividad2Recursos, actividad3Titulo, actividad3Duracion, actividad3InicioEstrategia, actividad3InicioMotivacion, actividad3InicioSaberes, actividad3InicioConflicto, actividad3DesarrolloEstrategia, actividad3DesarrolloConstruccion, actividad3DesarrolloContenido, actividad3DesarrolloEjercicios, actividad3CierreMetacognicion, actividad3CierreEvaluacion, actividad3CierreInstrumento, actividad3Recursos, listaCotejoTitulo, listaCotejoCriterios, rubricaTitulo, rubricaDimensiones, observaciones, bibliografia</code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 1: Curso ── */}
      {step === 1 && (
        <Card className="border border-border/60 bg-card rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border/60 px-8 py-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-black text-foreground uppercase tracking-tight">Seleccionar Curso</CardTitle>
                <p className="text-sm text-muted-foreground">Elige la unidad didáctica para precargar los datos</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="max-w-xl mx-auto space-y-6">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Selecciona tu curso</Label>
              <Select value={selectedAsgId} onValueChange={handleSelectCourse}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/50 border-border/60 text-base font-bold">
                  <BookOpen className="h-5 w-5 mr-3 text-primary" />
                  <SelectValue placeholder="Elige un curso asignado..." />
                </SelectTrigger>
                <SelectContent>
                  {asignaciones.map((asg) => (
                    <SelectItem key={asg.id} value={asg.id} className="py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{asg.unidad_nombre}</span>
                        <span className="text-[10px] text-muted-foreground">{asg.programa_nombre} · Sem {asg.semestre} {asg.seccion === 'REC' ? '· Recuperación' : ''}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {asignaciones.length === 0 && (
                <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-center">
                  <p className="text-sm text-muted-foreground">No tienes cursos asignados en el periodo actual.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Formulario ── */}
      {step === 2 && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => { setIsLoaded(false); setResult(null); setStep(1) }} className="h-9 px-4 rounded-xl text-xs font-bold gap-2">
                <RefreshCw className="h-3.5 w-3.5" /> Cambiar curso
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                <span className="font-semibold">{form.programaEstudios}</span>
                <ChevronRight className="h-3 w-3" />
                <span>{form.unidadDidactica}</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] gap-1.5 py-1">
              <FileText className="h-3 w-3" />
              {templateFileName}
            </Badge>
          </div>

          <Card className="border border-border/60 bg-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-border/60 px-8 py-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-black text-foreground uppercase tracking-tight">Información General</CardTitle>
                  <p className="text-[10px] font-semibold text-muted-foreground">Revisa y completa los campos para generar la ficha</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
              <ScrollArea className="h-[560px]">
                <div className="p-8 space-y-10">
                  {sections.map((sec) => (
                    <div key={sec.title}>
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-1 h-5 bg-primary/40 rounded-full" />
                        <h4 className="font-black text-xs uppercase tracking-widest text-foreground">{sec.title}</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 min-w-0">
                        {sec.fields.map((f) => {
                          if (f.key === "indicadorLogro") {
                            const selInd = indicators.find(i => i.id === selectedIndicatorId)
                            return (
                              <div key={f.key} className="md:col-span-2 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">{f.label}</Label>
                                {indicators.length > 0 ? (
                                  <>
                                    <Select value={selectedIndicatorId} onValueChange={setSelectedIndicatorId}>
                                      <SelectTrigger className="h-11 rounded-xl bg-muted/50 border-border/60 text-sm w-full">
                                        <SelectValue placeholder="Selecciona un indicador..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {indicators.map((ind) => (
                                          <SelectItem key={ind.id} value={ind.id} className="py-2.5">
                                            {ind.codigo} — {ind.descripcion}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {selInd && (
                                      <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">Peso: {selInd.peso_porcentaje}%</p>
                                    )}
                                  </>
                                ) : (
                                  <Textarea
                                    value={form.indicadorLogro}
                                    onChange={e => updateField("indicadorLogro", e.target.value)}
                                    placeholder="Escribe el indicador de logro manualmente (ej: C1.I4 Implementa algoritmos básicos...)"
                                    className="h-24 resize-none bg-muted/50 border-border/60 rounded-xl text-sm placeholder:text-muted-foreground/40 w-full"
                                  />
                                )}
                              </div>
                            )
                          }
                          if (f.key === "fechaDesarrollo") {
                            return (
                              <div key={f.key} className="md:col-span-2 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">{f.label}</Label>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <Label className="text-[9px] font-semibold text-muted-foreground mb-1 block">Desde</Label>
                                    <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="h-11 bg-muted/50 border-border/60 rounded-xl text-sm w-full" />
                                  </div>
                                  <span className="text-muted-foreground font-bold mt-6">→</span>
                                  <div className="flex-1 min-w-0">
                                    <Label className="text-[9px] font-semibold text-muted-foreground mb-1 block">Hasta</Label>
                                    <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="h-11 bg-muted/50 border-border/60 rounded-xl text-sm w-full" />
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return (
                            <div key={f.key} className={f.type === "textarea" ? "md:col-span-2 min-w-0" : "min-w-0"}>
                              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">{f.label}</Label>
                              {f.type === "textarea" ? (
                                <Textarea value={form[f.key]} onChange={e => updateField(f.key, e.target.value)} placeholder={f.placeholder} className="h-28 resize-none bg-muted/50 border-border/60 rounded-xl text-sm placeholder:text-muted-foreground/40 w-full" />
                              ) : (
                                <Input value={form[f.key]} onChange={e => updateField(f.key, e.target.value)} placeholder={f.placeholder} className="h-11 bg-muted/50 border-border/60 rounded-xl text-sm placeholder:text-muted-foreground/40 w-full" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button onClick={() => setStep(3)} className="h-14 px-10 rounded-2xl font-black text-sm gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              Siguiente <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </>
      )}

      {/* ── Step 3: Distribución de Horas ── */}
      {step === 3 && (
        <>
          <Card className="border border-border/60 bg-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-500/5 to-amber-500/10 border-b border-border/60 px-8 py-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-amber-500" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-black text-foreground uppercase tracking-tight">Distribución de Horas</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Total: {parseInt(form.horasTeoricas || '0') + parseInt(form.horasPracticas || '0')}h pedagógicas ({form.horasTeoricas || '0'}h teóricas + {form.horasPracticas || '0'}h prácticas)
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Actividades y horas</Label>
                  <p className="text-[10px] text-muted-foreground/60">Cada hora = 45 min pedagógicos. La suma debe igualar {parseInt(form.horasTeoricas || '0') + parseInt(form.horasPracticas || '0')}h totales.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {actividadHours.map((h, i) => (
                      <div key={i} className="bg-muted/30 border border-border rounded-xl p-4 space-y-2 relative group">
                        <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/10 hover:bg-red-500/20 border border-red-500/20" onClick={() => {
                          const next = [...actividadHours]
                          next.splice(i, 1)
                          setActividadHours(next)
                        }}>
                          <span className="text-[10px] font-black text-red-500">X</span>
                        </Button>
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Activ. {i + 1}</Label>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg text-xs font-black shrink-0" onClick={() => {
                            const next = [...actividadHours]
                            next[i] = Math.max(1, h - 1)
                            setActividadHours(next)
                          }} disabled={h <= 1}>−</Button>
                          <span className="flex-1 text-center font-black text-lg text-foreground">{h}h</span>
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg text-xs font-black shrink-0" onClick={() => {
                            const next = [...actividadHours]
                            next[i] = Math.min(12, h + 1)
                            setActividadHours(next)
                          }} disabled={h >= 12}>+</Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="h-full min-h-[108px] rounded-xl border-dashed" onClick={() => {
                      setActividadHours(prev => [...prev, 2])
                    }}>
                      + Agregar actividad
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-bold text-muted-foreground">Suma:</span>
                    <span className={`font-black text-lg ${actividadHours.reduce((a, b) => a + b, 0) === parseInt(form.horasTeoricas || '0') + parseInt(form.horasPracticas || '0') ? 'text-emerald-500' : 'text-red-500'}`}>
                      {actividadHours.reduce((a, b) => a + b, 0)}h
                    </span>
                    <span className="text-muted-foreground">de {parseInt(form.horasTeoricas || '0') + parseInt(form.horasPracticas || '0')}h totales</span>
                    {actividadHours.reduce((a, b) => a + b, 0) !== parseInt(form.horasTeoricas || '0') + parseInt(form.horasPracticas || '0') && (
                      <span className="text-[10px] text-red-500 font-bold">No coincide con el total</span>
                    )}
                  </div>
                </div>

                <Separator />

                {(isGenerating || isProcessingDocx) ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="font-bold text-sm text-muted-foreground">{loadingText}</p>
                  </div>
                ) : result && docxBlob ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 text-center">
                      <Download className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
                      <p className="font-black text-lg text-foreground">Ficha generada y descargada</p>
                      <p className="text-xs text-muted-foreground mt-1">La plantilla se ha llenado con los datos generados por IA.</p>
                    </div>
                    <div className="flex items-center gap-4 justify-center">
                      <Button onClick={handleDownloadDocx} className="h-14 px-10 rounded-2xl font-black text-sm gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20">
                        <Download className="h-5 w-5" /> Descargar de nuevo
                      </Button>
                      <Button variant="outline" onClick={() => { setResult(null); setDocxBlob(null) }} className="h-14 px-8 rounded-2xl font-black text-sm gap-2 border-2">
                        <RefreshCw className="h-5 w-5" /> Regenerar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <Button onClick={handleGenerate} disabled={isGenerating || actividadHours.reduce((a, b) => a + b, 0) !== parseInt(form.horasTeoricas || '0') + parseInt(form.horasPracticas || '0')} className="h-14 px-10 rounded-2xl font-black text-sm gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                      <Sparkles className="h-5 w-5" /> Generar Ficha con IA
                    </Button>
                    <Button variant="ghost" onClick={() => setStep(2)} className="h-14 px-6 rounded-2xl text-xs font-bold gap-2">
                      ← Volver al formulario
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Step 4: Descargar ── */}
      {step === 4 && result && (
        <div className="space-y-6">
          <Card className="border border-border/60 bg-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 border-b border-border/60 px-8 py-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Download className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-black text-foreground uppercase tracking-tight">Ficha Lista</CardTitle>
                  <p className="text-sm text-muted-foreground">Descarga tu ficha de sesión en formato Word usando la plantilla institucional</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="max-w-xl mx-auto space-y-8 text-center">
                <div className="p-8 bg-muted/50 border border-border rounded-2xl">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
                  <p className="font-bold text-lg text-foreground">{result.titulo}</p>
                  <p className="text-sm text-muted-foreground mt-2">Plantilla: {templateFileName}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={handleDownloadDocx} className="h-14 px-10 rounded-2xl font-black text-sm gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20">
                    <Download className="h-5 w-5" /> Descargar DOCX
                  </Button>
                  <Button variant="outline" onClick={() => { setResult(null); setStep(3) }} className="h-14 px-8 rounded-2xl font-black text-sm gap-2 border-2">
                    <RefreshCw className="h-5 w-5" /> Generar otra ficha
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
