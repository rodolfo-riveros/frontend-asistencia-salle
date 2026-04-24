"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, Gamepad2, Sparkles, 
  Loader2, RefreshCcw, Radio, Zap, CheckCircle2,
  Target, FileText, Users, Maximize2, X, Play, Trophy, ShieldCheck
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

  const createRoom = useMutation(convexApi.rooms.createRoom)
  const updateStatus = useMutation(convexApi.rooms.updateStatus)
  const room = useQuery(convexApi.rooms.getRoom, roomCode ? { roomCode } : "skip")

  const fetchSession = React.useCallback(async () => {
    setLoadingConfig(true)
    try {
      const quizEval = await api.get<any>(`/evaluaciones/${params.id}`)
      if (quizEval) {
        setConfig(quizEval)
        try {
          const activeSession = await api.get<any>(`/gamificacion/sesion/${quizEval.id}/`)
          if (activeSession && activeSession.room_code) {
            setRoomCode(activeSession.room_code)
            setSessionId(activeSession.sesion_id)
          }
        } catch (e) {
          console.log("No active session found. Ready for new launch.")
        }
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la configuración de la evaluación." })
    } finally {
      setLoadingConfig(false)
    }
  }, [params.id])

  React.useEffect(() => { fetchSession() }, [fetchSession])

  const handleLaunchRoom = async () => {
    const questions = config?.configuracion_json?.questions;
    if (!config || !questions || questions.length === 0) {
      return toast({ variant: "destructive", title: "Sin preguntas", description: "Asegúrate de generar preguntas con IA primero." })
    }
    
    setIsSyncing(true)
    try {
      const session = await api.post<any>('/gamificacion/sesion/', {
        evaluacion_id: config.id,
        configuracion_json: config.configuracion_json
      })

      if (!session || !session.room_code) throw new Error("Fallo al generar código de sala.")

      await createRoom({
        roomCode: session.room_code,
        questions: questions,
        configId: config.id,
        unidadId: config.unidad_id || "UD-SALLÉ"
      })

      setRoomCode(session.room_code)
      setSessionId(session.sesion_id)
      setIsFullscreen(true)
      toast({ title: "¡Sala Abierta!", description: `Código PIN: ${session.room_code}` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Conexión Fallida", description: "Verifica que Convex y el Backend estén operativos." })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleStartGame = async () => {
    if (!roomCode) return
    await updateStatus({ roomCode, status: 'active' })
    toast({ title: "¡Desafío Iniciado!" })
  }

  if (loadingConfig) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-black uppercase text-[10px] text-slate-400 tracking-[0.2em]">Sincronizando sesión académica...</p>
      </div>
    )
  }

  const questions = config?.configuracion_json?.questions || []

  if (isFullscreen && roomCode) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden animate-in fade-in duration-500">
        <div className="h-2 bg-gradient-to-r from-primary to-blue-400 w-full" />
        
        <div className="flex-grow flex flex-col lg:flex-row">
          <div className="w-full lg:w-[450px] bg-slate-50/50 p-12 flex flex-col justify-between border-r border-slate-100">
            <div className="space-y-10">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-primary rounded-[1.2rem] text-white shadow-xl">
                  <Gamepad2 className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Sallé Quizz Live</h2>
                  <p className="text-primary font-bold text-[9px] uppercase tracking-widest">{config.nombre}</p>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] border-4 border-primary/5 shadow-[0_30px_60px_rgba(0,0,0,0.05)] space-y-8 text-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
                 <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">PIN DE ACCESO</p>
                   <h3 className="text-8xl font-black text-primary font-mono tracking-widest">{roomCode}</h3>
                 </div>
                 <div className="pt-8 border-t border-slate-50 flex flex-col items-center gap-5">
                    <div className="p-4 bg-white border-2 border-slate-50 rounded-[2rem] shadow-sm">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.origin}/student/quiz/join?pin=${roomCode}`}
                        alt="QR Access"
                        className="w-44 h-44 rounded-xl"
                      />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <ShieldCheck className="h-3 w-3" /> Acceso Protegido
                    </p>
                 </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Alumnos Conectados</span>
                </div>
                <Badge className="bg-primary text-white font-black text-base px-4 py-1 rounded-xl shadow-lg shadow-primary/20">
                  {room?.participants?.length || 0}
                </Badge>
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={handleStartGame}
                  disabled={!room?.participants?.length}
                  className="w-full h-20 bg-primary hover:bg-primary/95 text-white rounded-[2rem] font-black uppercase text-lg shadow-2xl shadow-primary/30 gap-3 transition-all active:scale-95 disabled:grayscale"
                >
                  <Play className="h-7 w-7" /> INICIAR DESAFÍO
                </Button>
                <Button variant="ghost" onClick={() => setIsFullscreen(false)} className="w-full text-slate-400 font-bold uppercase text-[9px] tracking-widest hover:bg-transparent hover:text-primary transition-colors">Salir de pantalla completa</Button>
              </div>
            </div>
          </div>

          <div className="flex-grow p-16 relative bg-white overflow-y-auto">
             <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-10">
                {room?.participants?.map((p: any) => (
                  <div key={p._id} className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500 group">
                    <div className="relative">
                      <div className="absolute -inset-4 bg-primary rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-10 transition-opacity" />
                      <Avatar className="h-32 w-28 border-4 border-white shadow-[0_15px_35px_rgba(0,0,0,0.08)] rounded-[2.2rem] relative z-10 transition-transform group-hover:-translate-y-2 duration-300">
                        <AvatarFallback className="bg-blue-50 text-primary font-black text-3xl">
                          {getInitials(p.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-emerald-500 rounded-xl border-4 border-white z-20 flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <span className="text-[11px] font-black uppercase text-slate-800 tracking-tight text-center truncate w-full px-2 group-hover:text-primary transition-colors">{p.name.split(',')[0]}</span>
                  </div>
                ))}
                {(!room?.participants || room.participants.length === 0) && (
                  <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-200 py-32">
                    <div className="p-20 rounded-[5rem] border-4 border-dashed border-slate-50 flex flex-col items-center gap-6">
                       <Users className="h-24 w-24 opacity-10" />
                       <div className="space-y-1 text-center">
                         <p className="font-black uppercase tracking-[0.4em] text-[10px]">Esperando comunidad estudiantil...</p>
                         <p className="text-[9px] font-bold italic text-slate-300">Los avatars aparecerán automáticamente</p>
                       </div>
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
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-slate-100 pb-10">
        <div className="space-y-5">
          <Button variant="ghost" onClick={() => router.back()} className="h-9 text-primary font-bold px-0 hover:bg-transparent uppercase tracking-widest text-[9px] gap-2">
            <ArrowLeft className="h-4 w-4" /> VOLVER AL REGISTRO AUXILIAR
          </Button>
          <div className="flex items-center gap-5">
            <div className="p-4.5 bg-primary rounded-[1.8rem] text-white shadow-xl shadow-primary/10 border border-primary/5">
              <Gamepad2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-3xl md:text-5xl font-headline font-black text-slate-900 uppercase italic tracking-tighter">Sallé Quizz Live</h2>
              <p className="text-slate-400 font-medium italic text-base mt-1">Evaluación de alta exigencia técnica en tiempo real</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          {!roomCode ? (
            <Button onClick={handleLaunchRoom} disabled={isSyncing} className="h-18 px-12 bg-primary hover:bg-primary/95 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/20 gap-3 transition-all active:scale-95">
              {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5 animate-pulse" />} ABRIR SALA LIVE
            </Button>
          ) : (
            <div className="flex items-center gap-5 bg-white border-2 border-primary/5 p-4 pl-10 pr-6 rounded-[2rem] shadow-xl animate-in slide-in-from-right-8 duration-500">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.25em] mb-1">CÓDIGO ACTIVO</span>
                <span className="text-4xl font-black font-mono tracking-[0.25em] leading-none text-primary">{roomCode}</span>
              </div>
              <div className="h-12 w-px bg-slate-100 mx-4" />
              <Button onClick={() => setIsFullscreen(true)} className="bg-primary text-white h-16 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/15 transition-transform hover:scale-105">
                <Maximize2 className="h-4 w-4" /> PROYECTAR LOBBY
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <Card className="p-12 border-none shadow-[0_30px_70px_rgba(0,0,0,0.05)] bg-white rounded-[3.5rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-blue-400" />
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center gap-4">
                 <div className="p-3.5 bg-blue-50 rounded-2xl text-primary"><FileText className="h-7 w-7" /></div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800">Cuestionario Técnico</h3>
               </div>
               <Badge variant="outline" className="font-black text-primary border-primary/10 bg-primary/5 uppercase text-[10px] tracking-widest px-5 py-2 rounded-full shadow-sm">
                 {questions.length} PREGUNTAS IA
               </Badge>
            </div>
            
            <div className="space-y-8">
              {questions.length > 0 ? (
                questions.map((q: any, idx: number) => (
                  <div key={q.id || `view-q-${idx}`} className="p-10 bg-[#fbfcfd] rounded-[3rem] border-2 border-slate-100/60 space-y-8 transition-all hover:shadow-lg hover:border-primary/10 group">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-primary/50 uppercase tracking-widest">Pregunta Técnica {idx + 1}</span>
                        <p className="text-xl font-black text-slate-800 leading-tight uppercase tracking-tight group-hover:text-slate-900 transition-colors">{q.text}</p>
                      </div>
                      <Badge className="bg-white text-primary border-2 border-primary/5 font-black text-[10px] px-4 py-1.5 shrink-0 rounded-xl shadow-sm">{q.timeLimit}s</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {q.options.map((opt: string, oIdx: number) => (
                        <div key={`${q.id || idx}-opt-${oIdx}`} className={cn(
                          "p-5 rounded-2xl border-2 flex items-center justify-between transition-all",
                          q.correctIndex === oIdx 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" 
                            : "bg-white border-slate-50 text-slate-400 opacity-60"
                        )}>
                          <span className="text-[11px] font-bold uppercase tracking-tight leading-tight">{opt}</span>
                          {q.correctIndex === oIdx && <div className="h-6 w-6 bg-emerald-500 rounded-lg flex items-center justify-center text-white shadow-md"><CheckCircle2 className="h-4 w-4" /></div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-32 text-center border-4 border-dashed border-slate-50 rounded-[4rem]">
                   <Loader2 className="h-10 w-10 animate-spin text-primary/20 mx-auto mb-4" />
                   <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">Recuperando banco de preguntas...</p>
                </div>
              )}
            </div>
          </Card>
        </div>
        
        <div className="space-y-8">
          <Card className="p-12 border-none shadow-xl bg-slate-50 rounded-[3.5rem] relative overflow-hidden border border-slate-100">
            <h4 className="text-xl font-black uppercase tracking-tighter mb-10 flex items-center gap-3 text-slate-900"><Zap className="text-primary h-7 w-7" /> Origen Pedagógico</h4>
            {config && (
              <div className="space-y-8">
                <div className="p-8 bg-white rounded-[2.2rem] border-2 border-slate-100 space-y-3 shadow-sm relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                  <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest">INDICADOR DE LOGRO</span>
                  <div className="flex flex-col gap-4">
                     <Badge className="bg-primary text-white font-black text-[11px] rounded-xl px-4 py-1 w-fit shadow-md">{config.indicador_codigo}</Badge>
                     <p className="text-sm font-bold text-slate-700 leading-relaxed italic uppercase tracking-tight">{config.indicador_desc}</p>
                  </div>
                </div>

                <div className="p-8 bg-white rounded-[2.2rem] border-2 border-slate-100 space-y-6 shadow-sm relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-accent" />
                  <span className="text-[10px] font-black text-accent/40 uppercase tracking-widest flex items-center gap-2">
                    <Target className="h-3.5 w-3.5" /> CRITERIOS TÉCNICOS EVALUADOS
                  </span>
                  <div className="space-y-4">
                    {config.configuracion_json?.criteria?.map((c: any, i: number) => (
                      <div key={`crit-final-${i}`} className="flex gap-4 text-[12px] text-slate-500 items-start group/item">
                        <span className="font-black text-primary shrink-0 bg-primary/5 w-6 h-6 rounded-lg flex items-center justify-center group-hover/item:bg-primary group-hover/item:text-white transition-all duration-300 text-[10px]">{i + 1}</span>
                        <span className="italic leading-relaxed group-hover/item:text-slate-900 transition-colors uppercase font-medium">{c.description || c.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
          
          <div className="p-8 text-center space-y-4">
             <div className="h-px w-full bg-slate-100" />
             <div className="flex items-center justify-center gap-2 text-[9px] font-black uppercase text-slate-300 tracking-[0.2em]">
               <ShieldCheck className="h-3 w-3" /> IES LA SALLE URUBAMBA
             </div>
             <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
               Plataforma de Gestión por Rodolfo Riveros
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
