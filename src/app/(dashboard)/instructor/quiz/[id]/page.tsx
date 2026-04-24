
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, Gamepad2, Sparkles, 
  Loader2, RefreshCcw, Radio, Zap, CheckCircle2,
  Target, FileText, Users, Maximize2, X, Play, Trophy
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { useMutation, useQuery } from "convex/react"
import { api as convexApi } from "@convex/_generated/api"
import { cn, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function InstructorQuizPage() {
  const params = useParams()
  const router = useRouter()

  const [loadingConfig, setLoadingConfig] = React.useState(true)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [config, setConfig] = React.useState<any>(null)
  const [roomCode, setRoomCode] = React.useState<string | null>(null)
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  // Convex
  const createRoom = useMutation(convexApi.rooms.createRoom)
  const updateStatus = useMutation(convexApi.rooms.updateStatus)
  const room = useQuery(convexApi.rooms.getRoom, roomCode ? { roomCode } : "skip")

  const fetchSession = React.useCallback(async () => {
    setLoadingConfig(true)
    try {
      // Cargar la evaluación específica mediante su ID
      const quizEval = await api.get<any>(`/evaluaciones/${params.id}`)
      if (quizEval) {
        setConfig(quizEval)
        // Intentar recuperar si hay sesión activa para esta evaluación
        try {
          const activeSession = await api.get<any>(`/gamificacion/sesion/${quizEval.id}/`)
          if (activeSession && activeSession.room_code) {
            setRoomCode(activeSession.room_code)
            setSessionId(activeSession.sesion_id)
          }
        } catch (e) {
          console.log("No hay sesión activa inmediata. Habilitando creación manual.")
        }
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Configuración no encontrada", description: "Vuelve al registro auxiliar e intenta nuevamente." })
    } finally {
      setLoadingConfig(false)
    }
  }, [params.id])

  React.useEffect(() => { fetchSession() }, [fetchSession])

  const handleLaunchRoom = async () => {
    const questions = config?.configuracion_json?.questions;
    if (!config || !questions || questions.length === 0) {
      return toast({ variant: "destructive", title: "Sin preguntas", description: "Asegúrate de generar preguntas con IA en el Wizard primero." })
    }
    
    setIsSyncing(true)
    try {
      // 1. Crear sesión en FastAPI/Supabase para obtener el PIN oficial
      const session = await api.post<any>('/gamificacion/sesion/', {
        evaluacion_id: config.id,
        configuracion_json: config.configuracion_json
      })

      if (!session || !session.room_code) throw new Error("Fallo al generar código de sala.")

      // 2. Abrir sala en tiempo real (Convex)
      await createRoom({
        roomCode: session.room_code,
        questions: questions,
        configId: config.id,
        unidadId: config.unidad_id || "UD-SALLÉ"
      })

      setRoomCode(session.room_code)
      setSessionId(session.sesion_id)
      setIsFullscreen(true)
      toast({ title: "¡Sala en Vivo!", description: `Comparte el PIN: ${session.room_code}` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Conexión con Convex fallida", description: "Asegúrate de haber ejecutado 'npx convex dev' en tu terminal." })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleStartGame = async () => {
    if (!roomCode) return
    await updateStatus({ roomCode, status: 'active' })
    toast({ title: "¡Desafío en marcha!", description: "Los alumnos ya pueden responder la primera pregunta." })
  }

  if (loadingConfig) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-black uppercase text-[10px] text-slate-400 tracking-[0.2em]">Sincronizando con el servidor de La Salle...</p>
      </div>
    )
  }

  const questions = config?.configuracion_json?.questions || []

  // RENDER: MODO PROYECTABLE (PANTALLA COMPLETA)
  if (isFullscreen && roomCode) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden animate-in fade-in duration-500">
        <div className="h-2 bg-primary w-full" />
        
        <div className="flex-grow flex flex-col lg:flex-row">
          <div className="w-full lg:w-1/3 bg-slate-50 p-12 flex flex-col justify-between border-r border-slate-100">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary rounded-2xl text-white shadow-xl">
                  <Gamepad2 className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Sallé Quizz</h2>
                  <p className="text-primary font-bold text-[10px] uppercase tracking-widest">{config.nombre}</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border-4 border-primary/10 shadow-2xl space-y-6 text-center">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">PIN DE ACCESO</p>
                 <h3 className="text-7xl font-black text-primary font-mono tracking-widest">{roomCode}</h3>
                 <div className="pt-6 border-t border-slate-50">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.origin}/student/quiz/join?pin=${roomCode}`}
                      alt="QR Access"
                      className="mx-auto w-40 h-40 border-8 border-slate-50 rounded-2xl"
                    />
                    <p className="text-xs font-bold text-slate-500 mt-4 uppercase">Escanea para unirte</p>
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Alumnos Conectados</span>
                <Badge className="bg-emerald-500 text-white font-black px-3">{room?.participants?.length || 0}</Badge>
              </div>
              <Button 
                onClick={handleStartGame}
                disabled={!room?.participants?.length}
                className="w-full h-20 bg-primary hover:bg-primary/90 text-white rounded-3xl font-black uppercase text-lg shadow-2xl shadow-primary/30 gap-3 group transition-all"
              >
                <Play className="h-6 w-6 group-hover:scale-110 transition-transform" /> INICIAR DESAFÍO
              </Button>
              <Button variant="ghost" onClick={() => setIsFullscreen(false)} className="w-full text-slate-400 font-bold uppercase text-[10px] hover:bg-transparent hover:text-slate-600">Volver al panel docente</Button>
            </div>
          </div>

          <div className="flex-grow p-12 relative bg-white overflow-y-auto">
             <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-8">
                {room?.participants?.map((p: any) => (
                  <div key={p._id} className="flex flex-col items-center gap-3 animate-in zoom-in duration-300">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-primary rounded-[2rem] blur-xl opacity-0 group-hover:opacity-20 transition-all" />
                      <Avatar className="h-28 w-24 border-4 border-white shadow-xl rounded-[2rem]">
                        <AvatarFallback className="bg-blue-50 text-primary font-black text-2xl">
                          {getInitials(p.name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-700 tracking-tight text-center truncate w-full px-2">{p.name.split(',')[0]}</span>
                  </div>
                ))}
                {(!room?.participants || room.participants.length === 0) && (
                  <div className="col-span-full h-[60vh] flex flex-col items-center justify-center text-slate-300 gap-4">
                    <div className="p-16 rounded-[4rem] border-4 border-dashed border-slate-50 flex flex-col items-center">
                       <Users className="h-20 w-20 opacity-20 mb-4" />
                       <p className="font-black uppercase tracking-[0.3em] text-xs">Esperando comunidad estudiantil...</p>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b pb-8">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="h-9 text-primary font-bold px-0 hover:bg-transparent uppercase tracking-widest text-[10px]">
            <ArrowLeft className="mr-2 h-4 w-4" /> VOLVER AL REGISTRO
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-3xl text-primary shadow-sm border border-primary/10"><Gamepad2 className="h-10 w-10" /></div>
            <div>
              <h2 className="text-3xl md:text-4xl font-headline font-black text-slate-900 uppercase italic">Sallé Quizz Live</h2>
              <p className="text-slate-500 font-medium italic text-sm">Validación técnica y pedagógica de alta exigencia</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {!roomCode ? (
            <Button onClick={handleLaunchRoom} disabled={isSyncing} className="h-16 px-10 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-3 transition-all">
              {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5" />} Abrir Sala Live
            </Button>
          ) : (
            <div className="flex items-center gap-4 bg-blue-50 border-2 border-primary/10 p-4 px-8 rounded-3xl text-primary shadow-sm animate-in slide-in-from-right-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-primary/60 tracking-[0.2em] mb-1">PIN DE ACCESO</span>
                <span className="text-4xl font-black font-mono tracking-[0.2em] leading-none">{roomCode}</span>
              </div>
              <div className="h-10 w-px bg-primary/10 mx-4" />
              <Button onClick={() => setIsFullscreen(true)} className="bg-primary text-white h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-primary/20">
                <Maximize2 className="h-4 w-4" /> Pantalla Completa
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <Card className="p-10 border-none shadow-xl bg-white rounded-[3rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-3">
                 <div className="p-3 bg-blue-50 rounded-2xl text-primary"><FileText className="h-6 w-6" /></div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800">Cuestionario Técnico</h3>
               </div>
               <Badge variant="outline" className="font-black text-primary border-primary/20 bg-primary/5 uppercase text-[9px] tracking-widest px-4 py-1.5 rounded-full">
                 {questions.length} Preguntas
               </Badge>
            </div>
            
            <div className="space-y-6">
              {questions.length > 0 ? (
                questions.map((q: any, idx: number) => {
                  const qKey = q.id || `view-q-${idx}`
                  return (
                    <div key={qKey} className="p-8 bg-slate-50/50 rounded-[2.5rem] border-2 border-slate-100/50 space-y-6">
                      <div className="flex justify-between items-start">
                        <p className="text-lg font-black text-slate-800 leading-tight uppercase tracking-tight max-w-[85%]">{idx + 1}. {q.text}</p>
                        <Badge className="bg-white text-primary border-2 border-primary/10 font-bold text-[9px] px-3 py-1 shrink-0">{q.timeLimit}s</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt: string, oIdx: number) => (
                          <div key={`${qKey}-opt-${oIdx}`} className={cn(
                            "p-4 rounded-2xl border-2 flex items-center justify-between transition-all",
                            q.correctIndex === oIdx 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" 
                              : "bg-white border-slate-100 text-slate-400 opacity-60"
                          )}>
                            <span className="text-xs font-bold uppercase">{opt}</span>
                            {q.correctIndex === oIdx && <CheckCircle2 className="h-4 w-4" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-20 text-center border-4 border-dashed border-slate-100 rounded-[3rem]">
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando banco de preguntas...</p>
                </div>
              )}
            </div>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card className="p-10 border-none shadow-xl bg-slate-50 rounded-[3rem] relative overflow-hidden border border-slate-100">
            <h4 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3 text-slate-900"><Zap className="text-primary h-6 w-6" /> Resumen Pedagógico</h4>
            {config && (
              <div className="space-y-6">
                <div className="p-6 bg-white rounded-3xl border-2 border-slate-100 space-y-2 shadow-sm">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">INDICADOR DE LOGRO</span>
                  <div className="flex items-start gap-3">
                     <Badge className="bg-primary text-white font-black text-[10px] rounded-lg shrink-0">{config.indicador_codigo}</Badge>
                     <p className="text-xs font-bold text-slate-700 leading-relaxed italic">{config.indicador_desc}</p>
                  </div>
                </div>

                <div className="p-6 bg-white rounded-3xl border-2 border-slate-100 space-y-4 shadow-sm">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <Target className="h-3 w-3" /> CRITERIOS TÉCNICOS EVALUADOS
                  </span>
                  <div className="space-y-3">
                    {config.configuracion_json?.criteria?.map((c: any, i: number) => (
                      <div key={`crit-${i}`} className="flex gap-3 text-[11px] text-slate-500 items-start group">
                        <span className="font-black text-primary shrink-0 bg-primary/5 w-5 h-5 rounded-md flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">{i + 1}</span>
                        <span className="italic leading-relaxed group-hover:text-slate-900 transition-all">{c.description || c.category}</span>
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
