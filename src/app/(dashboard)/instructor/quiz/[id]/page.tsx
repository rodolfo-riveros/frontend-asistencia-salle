
"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, Play, Users, Trophy, Gamepad2, Sparkles, 
  Loader2, Save, Zap, AlertCircle, CloudUpload, Radio, RefreshCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QuestionEditor } from "@/components/quiz/QuestionEditor"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { generateQuiz } from "@/ai/flows/generate-quiz-flow"
import { useMutation, useQuery } from "convex/react"
import { api as convexApi } from "@/../convex/_generated/api"

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
  const [roomCode, setRoomCode] = React.useState<string | null>(null)

  // Convex
  const createRoom = useMutation(convexApi.rooms.createRoom)
  const updateStatus = useMutation(convexApi.rooms.updateStatus)
  const room = useQuery(convexApi.rooms.getRoom, roomCode ? { roomCode } : "skip")

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await api.get<any[]>(`/evaluaciones/config/${params.id}/${periodoId}`)
        // Buscamos la evaluación que tenga estrategia Quizz
        const quizConfig = data.find((c: any) => c.strategy === 'quizz' || c.tipo === 'quizz')
        if (quizConfig) {
          setConfig({
            id: quizConfig.id,
            nombre: quizConfig.name,
            criterios: quizConfig.criteria || []
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
      return toast({ variant: "destructive", title: "Sin Criterios", description: "Primero registra un instrumento para esta unidad." })
    }
    setIsGenerating(true)
    try {
      const result = await generateQuiz({
        criteria: config.criterios.map((c: any, i: number) => ({ id: i.toString(), description: c.description })),
        subjectName: config.nombre
      })
      setQuestions(result.questions)
      toast({ title: "Quizz Generado", description: "Preguntas creadas con éxito." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de IA", description: e.message })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleLaunchRoom = async () => {
    if (questions.length === 0) return
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      await createRoom({
        roomCode: code,
        questions,
        configId: config.id,
        unidadId: params.id as string
      })
      setRoomCode(code)
      toast({ title: "Sala Abierta", description: `PIN de acceso: ${code}` })
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear la sala en tiempo real." })
    }
  }

  const handleStartGame = async () => {
    if (!roomCode) return
    await updateStatus({ roomCode, status: 'active' })
  }

  const handleSyncToFastApi = async () => {
    if (!room?.participants || !config) return
    setIsSyncing(true)

    const payload = {
      evaluacion_id: config.id,
      notas: room.participants.map((p: any) => ({
        alumno_id: p.alumno_id || p._id, // Depende de cómo mapees el join
        aciertos: p.answers.filter((a: any) => a.isCorrect).length,
        total_preguntas: questions.length
      }))
    }

    try {
      await api.post('/evaluaciones/notas-gamificacion/', payload)
      toast({ title: "Notas Sincronizadas", description: "Los resultados han sido enviados al Registro Auxiliar." })
      await updateStatus({ roomCode: roomCode!, status: 'finished' })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de Sincronización", description: e.message })
    } finally {
      setIsSyncing(false)
    }
  }

  if (loadingConfig) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-black uppercase text-xs tracking-widest text-slate-400">Cargando...</p>
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
              <p className="text-slate-500 font-medium italic">Evaluaciones Interactivas con Convex + FastAPI</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {!roomCode ? (
            <>
              <Button onClick={handleAiGenerate} disabled={isGenerating} variant="outline" className="h-16 px-8 border-2 border-accent text-accent hover:bg-accent hover:text-white rounded-2xl font-black uppercase text-xs tracking-widest gap-3">
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} Auto-Generar con IA
              </Button>
              <Button onClick={handleLaunchRoom} disabled={questions.length === 0} className="h-16 px-10 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-3">
                <Radio className="h-5 w-5" /> Abrir Sala Live
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-4 bg-slate-900 px-8 py-4 rounded-2xl text-white">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-blue-300">PIN SALA</span>
                <span className="text-3xl font-black font-mono tracking-widest">{roomCode}</span>
              </div>
              <div className="flex gap-2">
                {room?.status === 'lobby' && (
                  <Button onClick={handleStartGame} className="bg-emerald-600 hover:bg-emerald-700 h-12 px-6">Iniciar Juego</Button>
                )}
                {room?.status === 'active' && (
                  <Button onClick={handleSyncToFastApi} disabled={isSyncing} className="bg-primary hover:bg-primary/90 h-12 px-6 gap-2">
                    {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Sincronizar Notas
                  </Button>
                )}
                <Button variant="outline" className="text-white border-white/20 h-12" onClick={() => setRoomCode(null)}>Cerrar</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {roomCode ? (
            <Card className="p-10 border-none shadow-2xl bg-white rounded-[3rem]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">Monitor de Participantes</h3>
                <Badge className={cn("h-8 px-4 font-black", room?.status === 'active' ? 'bg-red-500 text-white' : 'bg-emerald-100 text-emerald-700')}>
                  {room?.status === 'lobby' ? 'ESPERANDO' : 'EN VIVO'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {room?.participants?.map((p: any, i: number) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex flex-col items-center gap-2">
                     <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black">{p.name[0]}</div>
                     <span className="text-xs font-black uppercase text-slate-700 truncate w-full text-center">{p.name}</span>
                     <Badge variant="outline" className="text-[10px]">{p.answers.filter((a: any) => a.isCorrect).length} Correctas</Badge>
                  </div>
                ))}
                {(!room?.participants || room.participants.length === 0) && (
                  <div className="col-span-full py-20 text-center text-slate-300 uppercase font-black text-xs tracking-[0.2em]">Esperando a los alumnos...</div>
                )}
              </div>
            </Card>
          ) : (
            <QuestionEditor questions={questions} onUpdate={setQuestions} />
          )}
        </div>
        
        <div className="space-y-6">
          <Card className="p-8 border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem]">
            <h4 className="text-lg font-black uppercase tracking-tighter mb-4 flex items-center gap-2"><Zap className="text-yellow-400 h-5 w-5" /> Instrumento Origen</h4>
            {!config ? (
              <div className="p-6 bg-red-500/10 rounded-2xl border border-red-500/20 flex gap-3 text-red-200">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-[10px] font-bold uppercase leading-relaxed">No se encontraron criterios de evaluación para esta unidad.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                  <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest">Digitalización Vinculada</span>
                  <p className="text-sm font-black uppercase">{config.nombre}</p>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Base de Preguntas</span>
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
