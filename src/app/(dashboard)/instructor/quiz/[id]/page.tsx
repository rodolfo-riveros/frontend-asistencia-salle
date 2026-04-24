
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
        toast({ variant: "destructive", title: "Fallo de sincronización", description: e.message })
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
        <div className="h-2 bg-primary w-full" />
        <div className="flex-grow flex flex-col lg:flex-row">
          {/* Sidebar de Control del Juego */}
          <div className="w-full lg:w-[420px] bg-slate-50 p-10 flex flex-col justify-between border-r shadow-2xl z-10">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <Zap className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Monitor Arena</h2>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-center space-y-4 border-b-8 border-primary relative overflow-hidden">
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">PIN DE ACCESO</p>
                 <h3 className="text-7xl font-black text-primary font-mono tracking-tighter">{roomCode}</h3>
                 <div className="p-4 bg-slate-50 rounded-3xl inline-block border-2 border-slate-100">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin)}/student/quiz/join?pin=${roomCode}`} 
                      className="w-36 h-36 mix-blend-multiply" 
                      alt="QR" 
                    />
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Aspirantes: {room?.participants?.length || 0}</span>
                <Button variant="ghost" onClick={() => setIsFullscreen(false)} className="text-[9px] font-bold uppercase text-slate-400 hover:text-primary">Cerrar</Button>
              </div>
              {room.status === 'lobby' ? (
                <Button onClick={handleStartGame} disabled={!room?.participants?.length} className="w-full h-16 bg-primary text-white rounded-2xl font-black text-base shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:grayscale">
                  INICIAR JUEGO
                </Button>
              ) : room.status === 'active' ? (
                <Button onClick={handleFinishGame} className="w-full h-16 bg-accent text-white rounded-2xl font-black text-base shadow-xl transition-all hover:scale-[1.02]">
                  FINALIZAR Y VER PODIO
                </Button>
              ) : (
                <Button onClick={() => setIsFullscreen(false)} className="w-full h-16 bg-slate-800 text-white rounded-2xl font-black text-base">
                  SALIR
                </Button>
              )}
            </div>
          </div>

          {/* Area Principal de Visualización */}
          <div className="flex-grow p-12 bg-white overflow-y-auto relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(0,0,0,0.02)_1px,transparent_0)] bg-[size:32px_32px]" />
            {room.status === 'finished' ? (
              <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 relative z-10">
                <h2 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900 mb-16">Podio Salle Rank-UP</h2>
                <div className="flex items-end gap-8 h-[350px]">
                  {sortedParticipants[1] && (
                    <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-20 duration-500">
                      <div className="relative">
                        <Avatar className="h-28 w-28 border-4 border-slate-200 shadow-xl"><AvatarFallback className="text-2xl font-black bg-slate-100">{getInitials(sortedParticipants[1].name)}</AvatarFallback></Avatar>
                        <div className="absolute -top-3 -right-3 h-10 w-10 bg-slate-400 rounded-full flex items-center justify-center font-black text-white text-lg border-4 border-white shadow-lg">2</div>
                      </div>
                      <span className="font-black uppercase text-[10px] text-slate-600 truncate w-24 text-center">{sortedParticipants[1].name.split(',')[0]}</span>
                      <div className="h-32 w-28 bg-slate-100 rounded-t-3xl border-t-4 border-slate-200 shadow-lg flex flex-col items-center pt-4">
                         <span className="text-xl font-black text-slate-400">{sortedParticipants[1].score}</span>
                      </div>
                    </div>
                  )}
                  {sortedParticipants[0] && (
                    <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-32 duration-700">
                      <Crown className="h-16 w-16 text-yellow-400 animate-bounce" />
                      <div className="relative">
                        <Avatar className="h-40 w-42 border-[8px] border-yellow-400 shadow-2xl scale-110"><AvatarFallback className="text-4xl font-black bg-yellow-50">{getInitials(sortedParticipants[0].name)}</AvatarFallback></Avatar>
                        <div className="absolute -top-4 -right-4 h-14 w-14 bg-yellow-400 rounded-full flex items-center justify-center font-black text-white text-2xl border-[6px] border-white shadow-xl">1</div>
                      </div>
                      <span className="font-black uppercase text-sm text-slate-900 truncate w-32 text-center">{sortedParticipants[0].name.split(',')[0]}</span>
                      <div className="h-48 w-40 bg-yellow-400/10 rounded-t-[3rem] border-t-[10px] border-yellow-400 flex flex-col items-center pt-6 shadow-xl">
                        <span className="text-3xl font-black text-yellow-600">{sortedParticipants[0].score}</span>
                        <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mt-1">PUNTOS</span>
                      </div>
                    </div>
                  )}
                  {sortedParticipants[2] && (
                    <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-10 duration-1000">
                      <div className="relative">
                        <Avatar className="h-24 w-24 border-4 border-amber-600/20 shadow-xl"><AvatarFallback className="text-xl font-black bg-amber-50">{getInitials(sortedParticipants[2].name)}</AvatarFallback></Avatar>
                        <div className="absolute -top-2 -right-2 h-9 w-9 bg-amber-700/50 rounded-full flex items-center justify-center font-black text-white text-base border-4 border-white shadow-lg">3</div>
                      </div>
                      <span className="font-black uppercase text-[10px] text-slate-500 truncate w-24 text-center">{sortedParticipants[2].name.split(',')[0]}</span>
                      <div className="h-24 w-24 bg-amber-50 rounded-t-2xl border-t-4 border-amber-600/10 shadow-lg flex flex-col items-center pt-4">
                         <span className="text-lg font-black text-amber-600/60">{sortedParticipants[2].score}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-6 relative z-10">
                {room?.participants?.map((p: any) => (
                  <div key={p._id} className={cn(
                    "flex flex-col items-center gap-3 p-6 rounded-[2.5rem] border-4 transition-all group relative bg-white shadow-lg",
                    p.isCheating ? "border-red-500 animate-pulse" : "border-slate-50 hover:border-primary/20"
                  )}>
                    {p.isCheating && (
                      <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded-full z-20 shadow-xl">
                        <UserX className="h-3 w-3" />
                        <span className="text-[8px] font-black uppercase tracking-widest">FRAUDE</span>
                      </div>
                    )}
                    <Avatar className="h-20 w-20 border-4 border-white shadow-xl group-hover:scale-105 transition-transform">
                      <AvatarFallback className={cn("text-xl font-black uppercase", p.isCheating ? "bg-red-100 text-red-700" : "bg-primary/5 text-primary")}>
                        {getInitials(p.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center space-y-1">
                      <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{p.avatar}</p>
                      <p className="text-xs font-bold text-slate-900 truncate w-28 leading-none">{p.name.split(',')[0]}</p>
                      <p className="text-xl font-black text-primary pt-1">{p.score}</p>
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
    <div className="space-y-10 pb-20 font-body">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b pb-8">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="h-8 text-primary font-bold px-0 hover:bg-transparent uppercase tracking-widest text-[9px] gap-2">
            <ArrowLeft className="h-3 w-3" /> VOLVER
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary rounded-2xl text-white shadow-2xl">
              <Zap className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Rank-UP</h2>
              <p className="text-slate-400 font-medium italic text-sm mt-1">Plataforma de Gamificación Técnica Salle</p>
            </div>
          </div>
        </div>

        {!roomCode ? (
          <Button onClick={handleLaunchRoom} disabled={isSyncing} className="h-16 px-12 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl gap-3 transition-all active:scale-95 disabled:grayscale">
            {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5 animate-pulse" />} ABRIR ARENA
          </Button>
        ) : (
          <div className="flex items-center gap-4 bg-white border-2 border-primary/5 p-4 rounded-3xl shadow-xl">
            <div className="flex flex-col px-6 border-r">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">CÓDIGO ACTIVO</span>
              <span className="text-4xl font-black font-mono text-primary tracking-widest">{roomCode}</span>
            </div>
            <Button onClick={handleProjectArena} disabled={isSyncing} className="bg-primary text-white h-16 px-10 rounded-2xl font-black uppercase text-xs tracking-widest gap-2 shadow-xl hover:scale-105 active:scale-95">
              {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Maximize2 className="h-5 w-5" />} PROYECTAR
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <Card className="p-10 border-none shadow-2xl bg-white rounded-[3rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-blue-400" />
            <h3 className="text-xl font-black uppercase tracking-tighter italic text-slate-800 mb-8">Banco de Preguntas Técnicas</h3>
            <div className="space-y-8">
              {(config?.configuracion_json?.questions || []).map((q: any, idx: number) => (
                <div key={idx} className="p-8 bg-slate-50/50 rounded-[2.5rem] border-2 border-slate-100 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                       <Badge className="bg-primary text-white font-black text-[9px] px-4 py-0.5 rounded-full uppercase tracking-widest">FASE {idx + 1}</Badge>
                       <p className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">{q.text}</p>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border shadow-sm shrink-0 flex flex-col items-center">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-black text-base text-slate-900">{q.timeLimit}s</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt: string, oIdx: number) => (
                      <div key={oIdx} className={cn(
                        "p-4 rounded-xl border-2 text-[10px] font-bold uppercase flex items-center gap-3",
                        q.correctIndex === oIdx ? "bg-emerald-50 border-emerald-500/30 text-emerald-700" : "bg-white border-slate-50 text-slate-400"
                      )}>
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 font-black text-[9px]", q.correctIndex === oIdx ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-100 text-slate-200")}>
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
        
        <div className="space-y-6">
          <Card className="p-8 border-none shadow-2xl bg-slate-50 rounded-[2.5rem] sticky top-24">
            <h4 className="text-lg font-black uppercase tracking-tighter mb-8 flex items-center gap-3 text-slate-900">
              <BookOpen className="h-5 w-5 text-primary" /> Contexto Pedagógico
            </h4>
            {config && (
              <div className="space-y-6">
                <div className="p-6 bg-white rounded-3xl border-2 border-slate-100 space-y-3 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <Badge className="bg-primary text-white font-black px-3 py-1 rounded-lg block w-fit text-[10px]">{config.indicador_codigo}</Badge>
                  <p className="text-xs font-bold text-slate-700 uppercase leading-relaxed">{config.indicador_desc}</p>
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Criterios Evaluados</span>
                  <div className="grid gap-2">
                    {(config.configuracion_json?.criteria || []).map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-slate-100 group hover:border-primary/20 transition-all">
                         <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary font-black text-xs shrink-0">{i + 1}</div>
                         <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight leading-tight">{c.description || c.category}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 text-center border-t">
                   <div className="flex items-center justify-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                     <ShieldCheck className="h-3 w-3 text-primary/40" /> IES LA SALLE URUBAMBA
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
