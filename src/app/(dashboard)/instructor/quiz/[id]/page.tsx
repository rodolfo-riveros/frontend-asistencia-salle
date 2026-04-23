"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, Play, Users, Trophy, Gamepad2, Sparkles, 
  Loader2, Save, Zap, AlertCircle, CloudUpload
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QuestionEditor } from "@/components/quiz/QuestionEditor"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { generateQuiz } from "@/ai/flows/generate-quiz-flow"

export default function InstructorQuizPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const periodoId = searchParams.get('periodo_id') || "ACTUAL"

  const [loadingConfig, setLoadingConfig] = React.useState(true)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSyncing, setIsSyncing] = React.useState(false)
  
  const [config, setConfig] = React.useState<any>(null)
  const [questions, setQuestions] = React.useState<any[]>([])

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        // Carga configuraciones desde FastAPI
        const data = await api.get<any[]>(`/evaluaciones/config/${params.id}/${periodoId}`)
        // Buscamos la evaluación que tiene criterios definidos
        const quizConfig = data.find((c: any) => c.configuracion_json?.criteria)
        if (quizConfig) {
          setConfig({
            id: quizConfig.id,
            nombre: quizConfig.nombre,
            criterios: quizConfig.configuracion_json.criteria
          })
        }
      } catch (e) {
        console.error("Error al cargar config:", e)
      } finally {
        setLoadingConfig(false)
      }
    }
    fetchConfig()
  }, [params.id, periodoId])

  const handleAiGenerate = async () => {
    if (!config?.criterios?.length) {
      return toast({ variant: "destructive", title: "Sin Criterios", description: "Primero registra un instrumento con criterios para esta unidad." })
    }
    setIsGenerating(true)
    try {
      const result = await generateQuiz({
        criteria: config.criterios.map((c: any, i: number) => ({ id: i.toString(), description: c.description })),
        subjectName: config.nombre
      })
      setQuestions(result.questions)
      toast({ title: "Quizz Generado", description: "Preguntas creadas con éxito basándose en tus criterios SQL." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de IA", description: e.message })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSyncGrades = async () => {
    // Aquí el docente subiría un Excel o ingresaría notas de una app externa
    // o el backend gestionaría el socket. Por ahora, preparamos la conexión SQL.
    toast({ title: "Modo SQL Activo", description: "La gamificación se sincronizará vía FastAPI." })
  }

  if (loadingConfig) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-black uppercase text-xs tracking-widest text-slate-400">Sincronizando con FastAPI...</p>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="h-9 text-primary font-bold px-0 hover:bg-transparent uppercase tracking-widest text-[10px]">
            <ArrowLeft className="mr-2 h-4 w-4" /> VOLVER AL PANEL
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-accent rounded-3xl text-white shadow-2xl shadow-accent/20">
              <Gamepad2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-4xl font-headline font-black tracking-tight text-slate-900 uppercase italic">Gamificación</h2>
              <p className="text-slate-500 font-medium italic">Evaluaciones Interactivas vía FastAPI</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleAiGenerate} disabled={isGenerating} variant="outline" className="h-16 px-8 border-2 border-accent text-accent hover:bg-accent hover:text-white rounded-2xl font-black uppercase text-xs tracking-widest gap-3">
            {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} Auto-Generar con IA
          </Button>
          <Button onClick={handleSyncGrades} disabled={questions.length === 0} className="h-16 px-10 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-3">
            <CloudUpload className="h-5 w-5" /> Sincronizar Notas
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <QuestionEditor questions={questions} onUpdate={setQuestions} />
        </div>
        <div className="space-y-6">
          <Card className="p-8 border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem]">
            <h4 className="text-lg font-black uppercase tracking-tighter mb-4 flex items-center gap-2"><Zap className="text-yellow-400 h-5 w-5" /> Datos del Backend</h4>
            {!config ? (
              <div className="p-6 bg-red-500/10 rounded-2xl border border-red-500/20 flex gap-3 text-red-200">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-[10px] font-bold uppercase leading-relaxed">No se encontraron criterios registrados en la base de datos SQL para esta unidad.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest">Actividad Vinculada</span>
                  <p className="text-sm font-black uppercase">{config.nombre}</p>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Criterios de Evaluación</span>
                  <div className="space-y-2">
                    {config.criterios.map((c: any, i: number) => (
                      <div key={i} className="flex gap-2 text-[10px] text-white/60 items-start">
                        <span className="font-black text-white/90 shrink-0">{i + 1}.</span>
                        <span className="italic">{c.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
