
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, Gamepad2, Sparkles, 
  Loader2, Radio, Users, Maximize2, Play, Trophy, 
  ShieldCheck, UserX, Crown, Zap, Clock, BookOpen, 
  AlertTriangle 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { useMutation, useQuery } from "convex/react"
import { api as convexApi } from "@convex/_generated/api"
import { cn, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function InstructorQuizPage() {
  const params = useParams()
  const router = useRouter()

  const [loadingConfig, setLoadingConfig] = React.useState(true)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [config, setConfig] = React.useState<any>(null)
  const [roomCode, setRoomCode] = React.useState<string | null>(null)
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  const createRoom = useMutation(convexApi.rooms.createRoom)
  const updateStatus = useMutation(convexApi.rooms.updateStatus)
  const room = useQuery(convexApi.rooms.getRoom, roomCode ? { roomCode } : "skip")

  React.useEffect(() => {
    setMounted(true)
    fetchSession()
  }, [])

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
          console.log("No active session found") 
        }
      }
    } catch (e: any) {
      console.error("Error loading config:", e)
    } finally {
      setLoadingConfig(false)
    }
  }, [params.id])

  const handleLaunchRoom = async () => {
    const questions = config?.configuracion_json?.questions;
    if (!config || !questions?.length) {
      return toast({ variant: "destructive", title: "Sin preguntas generadas" })
    }
    
    setIsSyncing(true)
    try {
      const session = await api.post<any>('/gamificacion/sesion/', {
        evaluacion_id: config.id,
        configuracion_json: config.configuracion_json
      })

      if (!session?.room_code) throw new Error("PIN no generado")

      await createRoom({
        roomCode: session.room_code,
        questions: questions,
        configId: config.id,
        unidadId: config.unidad_id || "SALLE"
      })

      setRoomCode(session.room_code)
      setSessionId(session.sesion_id)
      setIsFullscreen(true)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fallo al abrir sala", description: e.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleProjectArena = async () => {
    if (!roomCode || !config) return;
    
    if (room === null) {
      setIsSyncing(true)
      try {
        await createRoom({
          roomCode: roomCode,
          questions: config?.configuracion_json?.questions || [],
          configId: config.id,
          unidadId: config.unidad_id || "SALLE"
        })
      } catch (e: any) {
        toast({ variant: "destructive", title: "Error de Sincronización", description: e.message })
        return
      } finally {
        setIsSyncing(false)
      }
    }
    setIsFullscreen(true)
  }

  const handleStartGame = async () => {
    if (!roomCode) return
    await updateStatus({ roomCode, status: 'active' })
    toast({ title: "¡Arena Iniciada!" })
  }

  const handleFinishGame = async () => {
    if (!roomCode || !sessionId) return
    await updateStatus({ roomCode, status: 'finished' })
    
    const results = room?.participants?.map(p => ({
      alumno_id: p.name, 
      puntaje: p.score
    })) || []

    try {
      await api.post(`/gamificacion/sesion/${sessionId}/finalizar/`, { notas: results })
      toast({ title: "Resultados Sincronizados" })
    } catch (e) { 
      toast({ variant: "destructive", title: "Error sincronizando notas" }) 
    }
  }

  const sortedParticipants = React.useMemo(() => {
    if (!room?.participants) return []
    return [...room.participants].sort((a, b) => b.score - a.score)
  }, [room?.participants])

  if (!mounted || loadingConfig) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-black uppercase text-[10px] tracking-widest text-slate-400">Preparando Arena Rank-UP...</p>
      </div>
    )
  }

  if (isFullscreen && roomCode) {
    if (room === undefined) return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
        <p className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Sincronizando con la Nube...</p>
      </div>
    )

    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-500 overflow-hidden font-body">
        <div className="h-2 bg-primary w-full shadow-lg" />
        <div className="flex-grow flex flex-col lg:flex-row">
          <div className="w-full lg:w-[450px] bg-slate-50 p-12 flex flex-col justify-between border-r shadow-2xl z-10">
            <div className="space-y-10">
              <div className="flex items-center gap-4">
                <Zap className="h-10 w-10 text-primary fill-primary" />
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Monitor Arena</h2>
              </div>

              <div className="bg-white p-10 rounded-[3rem] shadow-xl text-center space-y-6 border-b-8 border-primary relative overflow-hidden">
                 <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">PIN DE ACCESO</p>
                 <h3 className="text-8xl font-black text-primary font-mono tracking-tighter">{roomCode}</h3>
                 <div className="p-6 bg-slate-50 rounded-[2.5rem] inline-block border-2 border-slate-100 shadow-inner">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin)}/student/quiz/join?pin=${roomCode}`} 
                      className="w-44 h-44 mix-blend-multiply" 
                      alt="QR" 
                    />
                 </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center px-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ASPIRANTES</span>
                  <span className="text-2xl font-black text-slate-900">{room?.participants?.length || 0}</span>
                </div>
                <Button variant="ghost" onClick={() => setIsFullscreen(false)} className="text-[10px] font-bold uppercase text-slate-400 hover:text-primary tracking-widest">Cerrar</Button>
              </div>
              
              {room.status === 'lobby' ? (
                <Button onClick={handleStartGame} disabled={!room?.participants?.length} className="w-full h-20 bg-primary text-white rounded-[2rem] font-black text-lg shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:grayscale">
                  INICIAR ASCENSO
                </Button>
              ) : room.status === 'active' ? (
                <Button onClick={handleFinishGame} className="w-full h-20 bg-accent text-white rounded-[2rem] font-black text-lg shadow-xl transition-all hover:scale-[1.02]">
                  FINALIZAR Y VER PODIO
                </Button>
              ) : (
                <Button onClick={() => setIsFullscreen(false)} className="w-full h-20 bg-slate-800 text-white rounded-[2rem] font-black text-lg">
                  VOLVER AL PANEL
                </Button>
              )}
            </div>
          </div>

          <div className="flex-grow p-16 bg-white overflow-y-auto relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(34,97,203,0.03)_2px,transparent_0)] bg-[size:48px_48px]" />
            {room.status === 'finished' ? (
              <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 relative z-10">
                <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-slate-900 mb-16">Podio Salle Rank-UP</h2>
                <div className="flex items-end gap-8 md:gap-12 h-[450px]">
                  {sortedParticipants[1] && (
                    <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-24 duration-700">
                      <div className="relative">
                        <Avatar className="h-28 w-28 md:h-32 md:w-32 border-4 border-slate-200 shadow-2xl">
                          <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(sortedParticipants[1].avatar)}`} />
                          <AvatarFallback className="text-3xl font-black bg-slate-100">{getInitials(sortedParticipants[1].name)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-3 -right-3 h-10 w-10 bg-slate-400 rounded-full flex items-center justify-center font-black text-white text-lg border-2 border-white shadow-lg">2</div>
                      </div>
                      <span className="font-black uppercase text-[10px] text-slate-600 truncate w-32 text-center">{sortedParticipants[1].name.split(',')[0]}</span>
                      <div className="h-40 w-32 bg-slate-100 rounded-t-[2.5rem] border-t-8 border-slate-200 shadow-xl flex flex-col items-center pt-6">
                         <span className="text-3xl font-black text-slate-400">{sortedParticipants[1].score}</span>
                      </div>
                    </div>
                  )}
                  {sortedParticipants[0] && (
                    <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-40 duration-1000">
                      <Crown className="h-16 w-16 text-yellow-400 animate-bounce" />
                      <div className="relative">
                        <Avatar className="h-36 w-36 md:h-44 md:w-44 border-[10px] border-yellow-400 shadow-2xl scale-110">
                          <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(sortedParticipants[0].avatar)}`} />
                          <AvatarFallback className="text-5xl font-black bg-yellow-50">{getInitials(sortedParticipants[0].name)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-4 -right-4 h-14 w-14 bg-yellow-400 rounded-full flex items-center justify-center font-black text-white text-3xl border-4 border-white shadow-xl">1</div>
                      </div>
                      <span className="font-black uppercase text-sm md:text-base text-slate-900 truncate w-40 text-center">{sortedParticipants[0].name.split(',')[0]}</span>
                      <div className="h-56 w-44 bg-yellow-400/10 rounded-t-[4rem] border-t-[14px] border-yellow-400 flex flex-col items-center pt-8 shadow-2xl">
                        <span className="text-4xl md:text-5xl font-black text-yellow-600">{sortedParticipants[0].score}</span>
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] mt-2">PUNTOS</span>
                      </div>
                    </div>
                  )}
                  {sortedParticipants[2] && (
                    <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-16 duration-1000">
                      <div className="relative">
                        <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-amber-600/30 shadow-2xl">
                          <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(sortedParticipants[2].avatar)}`} />
                          <AvatarFallback className="text-2xl font-black bg-amber-50">{getInitials(sortedParticipants[2].name)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-2 -right-2 h-9 w-9 bg-amber-700/60 rounded-full flex items-center justify-center font-black text-white text-base border-2 border-white shadow-lg">3</div>
                      </div>
                      <span className="font-black uppercase text-[10px] text-slate-500 truncate w-32 text-center">{sortedParticipants[2].name.split(',')[0]}</span>
                      <div className="h-32 w-28 bg-amber-50 rounded-t-[2rem] border-t-8 border-amber-600/20 shadow-xl flex flex-col items-center pt-6">
                         <span className="text-2xl font-black text-amber-600/60">{sortedParticipants[2].score}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8 relative z-10">
                {room?.participants?.map((p: any) => (
                  <div key={p._id} className={cn(
                    "flex flex-col items-center gap-4 p-8 rounded-[3rem] border-4 transition-all group relative bg-white shadow-lg",
                    p.isCheating ? "border-red-500 animate-pulse bg-red-50" : "border-slate-50 hover:border-primary/30"
                  )}>
                    {p.isCheating && (
                      <div className="absolute -top-3 -right-3 flex items-center gap-2 bg-red-600 text-white px-4 py-1.5 rounded-full z-20 shadow-xl border-4 border-white animate-bounce">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">FRAUDE</span>
                      </div>
                    )}
                    <Avatar className="h-24 w-24 border-4 border-white shadow-xl group-hover:scale-110 transition-transform">
                      <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(p.avatar)}`} />
                      <AvatarFallback className={cn("text-2xl font-black uppercase", p.isCheating ? "bg-red-200 text-red-800" : "bg-primary/10 text-primary")}>
                        {getInitials(p.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center space-y-2">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest truncate w-24">{p.avatar}</p>
                      <p className="text-sm font-black text-slate-900 truncate w-32 leading-none uppercase">{p.name.split(',')[0]}</p>
                      <div className="bg-primary/5 rounded-2xl py-1.5 px-3 inline-block">
                        <p className="text-xl font-black text-primary leading-none">{p.score}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-20 font-body">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b-2 border-slate-100 pb-10">
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => router.back()} className="h-10 text-primary font-black px-0 hover:bg-transparent uppercase tracking-[0.2em] text-[10px] gap-3">
            <ArrowLeft className="h-4 w-4" /> VOLVER AL REGISTRO
          </Button>
          <div className="flex items-center gap-6">
            <div className="p-6 bg-primary rounded-[2rem] text-white shadow-2xl shadow-primary/30">
              <Zap className="h-10 w-10 fill-current" />
            </div>
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Rank-UP</h2>
              <p className="text-slate-400 font-bold italic text-base mt-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> Arena de Gamificación Técnica Salle
              </p>
            </div>
          </div>
        </div>

        {!roomCode ? (
          <Button onClick={handleLaunchRoom} disabled={isSyncing} className="h-20 px-14 bg-primary text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl gap-4 transition-all active:scale-95 disabled:grayscale">
            {isSyncing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Radio className="h-6 w-6 animate-pulse" />} LANZAR DESAFÍO
          </Button>
        ) : (
          <div className="flex items-center gap-6 bg-white border-2 border-slate-100 p-6 rounded-[2.5rem] shadow-2xl">
            <div className="flex flex-col px-8 border-r-2 border-slate-100">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">CÓDIGO ACTIVO</span>
              <span className="text-5xl font-black font-mono text-primary tracking-tighter">{roomCode}</span>
            </div>
            <Button onClick={handleProjectArena} disabled={isSyncing} className="bg-primary text-white h-20 px-12 rounded-[2rem] font-black uppercase text-sm tracking-widest gap-4 shadow-xl hover:scale-105 active:scale-95 transition-all">
              {isSyncing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Maximize2 className="h-6 w-6" />} PROYECTAR ARENA
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <Card className="p-12 border-none shadow-2xl bg-white rounded-[4rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-primary via-blue-400 to-accent" />
            <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800 mb-10 flex items-center gap-4">
              <BookOpen className="h-7 w-7 text-primary" /> Banco de Preguntas de Alta Exigencia
            </h3>
            <div className="space-y-10">
              {(config?.configuracion_json?.questions || []).map((q: any, idx: number) => (
                <div key={idx} className="p-10 bg-slate-50/50 rounded-[3.5rem] border-2 border-slate-100 space-y-8 group hover:bg-white hover:border-primary/10 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3">
                       <Badge className="bg-primary text-white font-black text-[10px] px-6 py-1 rounded-full uppercase tracking-[0.3em]">NIVEL {idx + 1}</Badge>
                       <p className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-tight max-w-2xl">{q.text}</p>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-sm shrink-0 flex flex-col items-center">
                      <Clock className="h-5 w-5 text-primary mb-1" />
                      <span className="font-black text-xl text-slate-900">{q.timeLimit}s</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((opt: string, oIdx: number) => (
                      <div key={oIdx} className={cn(
                        "p-5 rounded-2xl border-2 text-[11px] font-black uppercase flex items-center gap-4 shadow-sm",
                        q.correctIndex === oIdx ? "bg-emerald-50 border-emerald-500/30 text-emerald-700" : "bg-white border-slate-100 text-slate-400"
                      )}>
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border-2 font-black text-[10px]", q.correctIndex === oIdx ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-100 text-slate-200")}>
                          {String.fromCharCode(65 + oIdx)}
                        </div>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        
        <div className="space-y-8">
          <Card className="p-10 border-none shadow-2xl bg-slate-900 rounded-[3.5rem] sticky top-28 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            <h4 className="text-xl font-black uppercase tracking-widest mb-10 flex items-center gap-4 text-blue-100">
              <ShieldCheck className="h-7 w-7 text-primary" /> Contexto Académico
            </h4>
            {config && (
              <div className="space-y-10">
                <div className="p-8 bg-white/5 rounded-[2.5rem] border-2 border-white/10 space-y-4 shadow-inner relative overflow-hidden group hover:bg-white/10 transition-all">
                  <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
                  <Badge className="bg-primary text-white font-black px-4 py-1 rounded-xl block w-fit text-[11px] tracking-widest">{config.indicador_codigo}</Badge>
                  <p className="text-sm font-bold text-blue-50/90 uppercase leading-relaxed">{config.indicador_desc}</p>
                </div>

                <div className="space-y-6">
                  <span className="text-[11px] font-black text-blue-300/50 uppercase tracking-[0.4em] ml-4">Criterios de Evaluación</span>
                  <div className="grid gap-3">
                    {(config.configuracion_json?.criteria || []).map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-5 p-5 bg-white/5 rounded-3xl border-2 border-white/5 group hover:border-primary/30 transition-all">
                         <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black text-sm shrink-0">{i + 1}</div>
                         <p className="text-[11px] font-black text-blue-50/70 uppercase tracking-tight leading-relaxed">{c.description || c.category}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-10 text-center border-t border-white/10">
                   <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase text-white/20 tracking-[0.3em]">
                     <ShieldCheck className="h-4 w-4" /> IES LA SALLE URUBAMBA
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
