
"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, Play, Users, Trophy, Gamepad2, Sparkles, 
  Loader2, Save, Zap, AlertCircle, Radio, RefreshCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QuestionEditor } from "@/components/quiz/QuestionEditor"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { generateQuiz } from "@/ai/flows/generate-quiz-flow"
import { useMutation, useQuery } from "convex/react"
import { api as convexApi } from "@convex/_generated/api"
import { cn } from "@/lib/utils"

export default function InstructorQuizPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const periodoId = searchParams.get('periodo_id') || "ACTUAL"

  const [loadingConfig, setLoadingConfig] = React.useState(true)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [config, setConfig] = React.useState<any>(null)
  const [sessionData, setSessionData] = React.useState<any>(null)
  const [questions, setQuestions] = React.useState<any[]>([])
  const [roomCode, setRoomCode] = React.useState<string | null>(null)

  // Convex
  const createRoom = useMutation(convexApi.rooms.createRoom)
  const updateStatus = useMutation(convexApi.rooms.updateStatus)
  const room = useQuery(convexApi.rooms.getRoom, roomCode ? { roomCode } : "skip")

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await api.get<any>(`/evaluaciones/config/${params.id}/${periodoId}`)
        // Buscamos la evaluación que sea Quizz
        const quizEval = data.evaluaciones?.find((ev: any) => ev.tipo === 'quizz' || ev.configuracion_json?.strategy === 'quizz')
        
        if (quizEval) {
          setConfig(quizEval)
          setQuestions(quizEval.configuracion_json?.questions || [])

          // Buscar si hay sesión activa para esta evaluación
          try {
            const activeSession = await api.get<any>(`/gamificacion/sesion/${quizEval.id}/`)
            if (activeSession && activeSession.room_code) {
              setRoomCode(activeSession.room_code)
              setSessionData(activeSession)
            }
          } catch (e) {
            console.log("No active session found")
          }
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
    if (!config?.configuracion_json?.criteria?.length) {
      return toast({ variant: "destructive", title: "Sin Criterios", description: "Define criterios pedagógicos primero." })
    }
    setIsGenerating(true)
    try {
      const result = await generateQuiz({
        criteria: config.configuracion_json.criteria.map((c: any, i: number) => ({ id: i.toString(), description: c.description || c.category })),
        subjectName: config.nombre
      })
      setQuestions(result.questions)
      toast({ title: "Quizz Generado", description: "Nuevas preguntas creadas con éxito." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de IA", description: e.message })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleLaunchRoom = async () => {
    if (questions.length === 0) return
    setIsSyncing(true)
    try {
      // 1. Crear sesión en FastAPI
      const res = await api.post<any>('/gamificacion/sesion/', {
        evaluacion_id: config.id,
        configuracion_json: {
          ...config.configuracion_json,
          questions: questions
        }
      })

      setSessionData(res)
      const code = res.room_code

      // 2. Abrir sala en Convex
      await createRoom({
        roomCode: code,
        questions,
        configId: config.id,
        unidadId: params.id as string
      })

      setRoomCode(code)
      toast({ title: "Sala Abierta", description: `PIN de acceso: ${code}` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "No se pudo iniciar la sala." })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleStartGame = async () => {
    if (!roomCode) return
    await updateStatus({ roomCode, status: 'active' })
  }

  const handleSyncToFastApi = async () => {
    if (!room?.participants || !sessionData?.sesion_id) return
    setIsSyncing(true)

    const payload = {
      notas: room.participants.map((p: any) => ({
        alumno_id: p.name, // El backend debe resolver el ID por nombre o usar ID real si lo capturamos
        aciertos: p.answers.filter((a: any) => a.isCorrect).length,
        total_preguntas: questions.length
      }))
    }

    try {
      await api.post(`/gamificacion/sesion/${sessionData.sesion_id}/finalizar/`, payload)
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
        <p className="font-black uppercase text-xs tracking-widest text-slate-400">Cargando Monitor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b pb-8">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="h-9 text-primary font-bold px-0 hover:bg-transparent uppercase tracking-widest text-[10px]">
            <ArrowLeft className="mr-2 h-4 w-4" /> VOLVER AL PANEL
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-accent rounded-3xl text-white shadow-2xl shadow-accent/20">
              <Gamepad2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-headline font-black tracking-tight text-slate-900 uppercase italic">Control de Gamificación</h2>
              <p className="text-slate-500 font-medium italic text-sm">Sincronización en tiempo real con Convex + FastAPI</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {!roomCode ? (
            <>
              <Button onClick={handleAiGenerate} disabled={isGenerating} variant="outline" className="h-16 px-8 border-2 border-accent text-accent hover:bg-accent hover:text-white rounded-2xl font-black uppercase text-xs tracking-widest gap-3 transition-all">
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} Regenerar con IA
              </Button>
              <Button onClick={handleLaunchRoom} disabled={questions.length === 0 || isSyncing} className="h-16 px-10 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-3">
                {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5" />} Abrir Sala Live
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-4 bg-slate-900 p-4 px-8 rounded-3xl text-white shadow-2xl border border-white/10">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-blue-300 tracking-[0.2em] mb-1">PIN DE ACCESO</span>
                <span className="text-4xl font-black font-mono tracking-[0.2em] leading-none">{roomCode}</span>
              </div>
              <div className="h-10 w-px bg-white/10 mx-4" />
              <div className="flex gap-2">
                {room?.status === 'lobby' && (
                  <Button onClick={handleStartGame} className="bg-emerald-600 hover:bg-emerald-700 h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest">Iniciar Juego</Button>
                )}
                {room?.status === 'active' && (
                  <Button onClick={handleSyncToFastApi} disabled={isSyncing} className="bg-primary hover:bg-primary/90 h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20">
                    {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Finalizar y Sincronizar
                  </Button>
                )}
                <Button variant="outline" className="text-white border-white/20 hover:bg-white/10 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest" onClick={() => setRoomCode(null)}>Cerrar</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {roomCode ? (
            <Card className="p-10 border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-accent" />
              <div className="flex items-center justify-between mb-12">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800">Monitor de Estudiantes</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Seguimiento en tiempo real</p>
                </div>
                <Badge className={cn("h-10 px-6 font-black uppercase tracking-widest text-[10px]", room?.status === 'active' ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-100 text-emerald-700')}>
                  {room?.status === 'lobby' ? '● ESPERANDO CONEXIONES' : '● DESAFÍO EN CURSO'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {room?.participants?.map((p: any, i: number) => (
                  <div key={p._id || i} className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 flex flex-col items-center gap-4 group hover:border-accent/20 transition-all shadow-sm">
                     <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-2xl shadow-inner border-2 border-white">{p.name[0]}</div>
                     <div className="text-center w-full">
                       <p className="text-xs font-black uppercase text-slate-700 truncate mb-1">{p.name}</p>
                       <Badge variant="outline" className="text-[10px] font-black border-accent/20 text-accent bg-accent/5">{p.answers?.filter((a: any) => a.isCorrect).length || 0} Correctas</Badge>
                     </div>
                  </div>
                ))}
                {(!room?.participants || room.participants.length === 0) && (
                  <div className="col-span-full py-24 text-center space-y-4">
                    <div className="p-6 bg-slate-50 rounded-full w-fit mx-auto mb-4 animate-bounce">
                      <Users className="h-12 w-12 text-slate-200" />
                    </div>
                    <p className="text-slate-300 uppercase font-black text-xs tracking-[0.3em]">Esperando que los alumnos ingresen el PIN...</p>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                 <div className="h-8 w-2 bg-primary rounded-full" />
                 <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800">Editor de Banco de Preguntas</h3>
              </div>
              <QuestionEditor questions={questions} onUpdate={setQuestions} />
            </div>
          )}
        </div>
        
        <div className="space-y-6">
          <Card className="p-10 border-none shadow-xl bg-slate-900 text-white rounded-[3rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Zap className="h-32 w-32" />
            </div>
            <h4 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3"><Zap className="text-yellow-400 h-6 w-6" /> Origen Pedagógico</h4>
            {!config ? (
              <div className="p-6 bg-red-500/10 rounded-3xl border border-red-500/20 flex gap-4 text-red-200">
                <AlertCircle className="h-6 w-6 shrink-0" />
                <p className="text-xs font-bold uppercase leading-relaxed">No se detectó un instrumento base para esta evaluación técnica.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-2 backdrop-blur-sm">
                  <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest">ACTIVIDAD VINCULADA</span>
                  <p className="text-base font-black uppercase leading-tight">{config.nombre}</p>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4 backdrop-blur-sm">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CRITERIOS TÉCNICOS A EVALUAR</span>
                  <div className="space-y-3">
                    {config.configuracion_json?.criteria?.map((c: any, i: number) => (
                      <div key={i} className="flex gap-3 text-[11px] text-white/60 items-start group">
                        <span className="font-black text-white/90 shrink-0 bg-white/10 w-5 h-5 rounded-md flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">{i + 1}</span>
                        <span className="italic leading-relaxed">{c.description || c.category}</span>
                      </div>
                    ))}
                    {(!config.configuracion_json?.criteria || config.configuracion_json.criteria.length === 0) && (
                      <p className="text-[10px] italic text-white/30">Sin criterios detallados.</p>
                    )}
                  </div>
                </div>
                <div className="pt-4 text-center">
                   <Badge variant="outline" className="text-[8px] font-black uppercase text-blue-300 border-blue-300/20 px-4 py-1">Integridad de Datos OK</Badge>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
