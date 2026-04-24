
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, Gamepad2, Sparkles, 
  Loader2, Radio, Users, Maximize2, Play, Trophy, ShieldCheck, UserX, Crown, Zap, Clock, BookOpen
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
      // Cargar configuración específica de la evaluación por ID
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
          console.log("No active session found for this eval") 
        }
      }
    } catch (e: any) {
      console.error("Error loading config:", e)
    } finally {
      setLoadingConfig(false)
    }
  }, [params.id])

  React.useEffect(() => { fetchSession() }, [fetchSession])

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
        unidadId: config.unidad_id || "SALLÉ"
      })

      setRoomCode(session.room_code)
      setSessionId(session.sesion_id)
      setIsFullscreen(true)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fallo al abrir sala" })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleStartGame = async () => {
    if (!roomCode) return
    await updateStatus({ roomCode, status: 'active' })
    toast({ title: "¡Rank-UP Iniciado!" })
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
      toast({ title: "Notas sincronizadas" })
    } catch (e) { 
      toast({ variant: "destructive", title: "Error sincronizando notas" }) 
    }
  }

  const sortedParticipants = React.useMemo(() => {
    if (!room?.participants) return []
    return [...room.participants].sort((a, b) => b.score - a.score)
  }, [room?.participants])

  if (loadingConfig) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-black uppercase text-[10px] tracking-widest text-slate-400">Preparando Arena Rank-UP...</p>
      </div>
    )
  }

  // Monitor en modo pantalla completa (Lobby o Arena)
  if (isFullscreen && roomCode) {
    if (!room) {
      return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="font-black uppercase text-[10px] tracking-widest text-slate-400">Estableciendo conexión con la Arena...</p>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-500 overflow-hidden">
        <div className="h-2 bg-primary w-full" />
        <div className="flex-grow flex flex-col lg:flex-row">
          <div className="w-full lg:w-[450px] bg-slate-50 p-12 flex flex-col justify-between border-r shadow-2xl z-10">
            <div className="space-y-10">
              <div className="flex items-center gap-4">
                <Zap className="h-10 w-10 text-primary" />
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Rank-UP</h2>
              </div>

              <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6 border-b-8 border-primary relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-primary/10" />
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">PIN DEL DESAFÍO</p>
                 <h3 className="text-8xl font-black text-primary font-mono tracking-tighter">{roomCode}</h3>
                 <div className="p-4 bg-slate-50 rounded-3xl inline-block border-2 border-slate-100 shadow-inner">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.origin}/student/quiz/join?pin=${roomCode}`} className="w-44 h-44 mix-blend-multiply" alt="QR" />
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Aspirantes: {room?.participants?.length || 0}</span>
                <Button variant="ghost" onClick={() => setIsFullscreen(false)} className="text-[9px] font-bold uppercase text-slate-400 hover:text-primary">Cerrar Monitor</Button>
              </div>
              {room.status === 'lobby' ? (
                <Button onClick={handleStartGame} disabled={!room?.participants?.length} className="w-full h-20 bg-primary text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:grayscale">
                  INICIAR ASCENSO
                </Button>
              ) : room.status === 'active' ? (
                <Button onClick={handleFinishGame} className="w-full h-20 bg-accent text-white rounded-[2rem] font-black text-lg shadow-2xl transition-all hover:scale-[1.02] active:scale-95">
                  FINALIZAR Y VER PODIO
                </Button>
              ) : (
                <Button onClick={() => setIsFullscreen(false)} className="w-full h-20 bg-slate-800 text-white rounded-[2rem] font-black text-lg transition-all">
                  SALIR DEL JUEGO
                </Button>
              )}
            </div>
          </div>

          <div className="flex-grow p-16 bg-white overflow-y-auto relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(0,0,0,0.02)_1px,transparent_0)] bg-[size:32px_32px]" />
            {room.status === 'finished' ? (
              <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 relative z-10">
                <h2 className="text-6xl font-black uppercase italic tracking-tighter text-slate-900 mb-20 drop-shadow-sm">Podio Rank-UP</h2>
                <div className="flex items-end gap-10">
                  {/* Segundo Puesto */}
                  {sortedParticipants[1] && (
                    <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-20 duration-500">
                      <div className="relative">
                        <Avatar className="h-36 w-36 border-4 border-slate-200 shadow-2xl"><AvatarFallback className="text-3xl font-black bg-slate-100">{getInitials(sortedParticipants[1].name)}</AvatarFallback></Avatar>
                        <div className="absolute -top-4 -right-4 h-14 w-14 bg-slate-400 rounded-full flex items-center justify-center font-black text-white text-2xl border-4 border-white shadow-xl">2</div>
                      </div>
                      <span className="font-black uppercase text-sm text-slate-600 tracking-tight">{sortedParticipants[1].name.split(',')[0]}</span>
                      <div className="h-44 w-36 bg-slate-100 rounded-t-[2.5rem] border-t-8 border-slate-200 shadow-lg flex flex-col items-center pt-8">
                         <span className="text-2xl font-black text-slate-400">{sortedParticipants[1].score}</span>
                      </div>
                    </div>
                  )}
                  {/* Primero Puesto */}
                  {sortedParticipants[0] && (
                    <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-32 duration-700">
                      <Crown className="h-20 w-20 text-yellow-400 animate-bounce drop-shadow-lg" />
                      <div className="relative">
                        <Avatar className="h-52 w-52 border-[10px] border-yellow-400 shadow-[0_40px_80px_-15px_rgba(234,179,8,0.3)] scale-110"><AvatarFallback className="text-5xl font-black bg-yellow-50">{getInitials(sortedParticipants[0].name)}</AvatarFallback></Avatar>
                        <div className="absolute -top-6 -right-6 h-20 w-20 bg-yellow-400 rounded-full flex items-center justify-center font-black text-white text-4xl border-[8px] border-white shadow-2xl">1</div>
                      </div>
                      <span className="font-black uppercase text-2xl text-slate-900 tracking-tighter">{sortedParticipants[0].name.split(',')[0]}</span>
                      <div className="h-72 w-52 bg-yellow-400/10 rounded-t-[4rem] border-t-[12px] border-yellow-400 flex flex-col items-center pt-10 shadow-xl">
                        <span className="text-4xl font-black text-yellow-600">{sortedParticipants[0].score}</span>
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] mt-2">PUNTOS</span>
                      </div>
                    </div>
                  )}
                  {/* Tercer Puesto */}
                  {sortedParticipants[2] && (
                    <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-10 duration-1000">
                      <div className="relative">
                        <Avatar className="h-32 w-32 border-4 border-amber-600/30 shadow-2xl"><AvatarFallback className="text-2xl font-black bg-amber-50">{getInitials(sortedParticipants[2].name)}</AvatarFallback></Avatar>
                        <div className="absolute -top-4 -right-4 h-12 w-12 bg-amber-700/60 rounded-full flex items-center justify-center font-black text-white text-xl border-4 border-white shadow-xl">3</div>
                      </div>
                      <span className="font-black uppercase text-sm text-slate-500 tracking-tight">{sortedParticipants[2].name.split(',')[0]}</span>
                      <div className="h-36 w-32 bg-amber-50 rounded-t-[2rem] border-t-8 border-amber-600/20 shadow-lg flex flex-col items-center pt-6">
                         <span className="text-xl font-black text-amber-600/60">{sortedParticipants[2].score}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-8 relative z-10">
                {room?.participants?.map((p: any) => (
                  <div key={p._id} className={cn(
                    "flex flex-col items-center gap-3 p-8 rounded-[3.5rem] border-4 transition-all group relative",
                    p.isCheating ? "border-red-500 bg-red-50 animate-pulse shadow-[0_30px_60px_-12px_rgba(239,68,68,0.2)]" : "border-slate-50 hover:border-primary/20 bg-white shadow-xl hover:shadow-2xl hover:-translate-y-2"
                  )}>
                    {p.isCheating && (
                      <div className="absolute -top-3 -right-3 flex items-center gap-2 bg-red-600 text-white px-4 py-1.5 rounded-full z-20 shadow-xl animate-bounce">
                        <UserX className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">FRAUDE</span>
                      </div>
                    )}
                    <div className="relative">
                      <Avatar className="h-28 w-28 border-4 border-white shadow-2xl group-hover:scale-110 transition-transform">
                        <AvatarFallback className={cn("text-2xl font-black uppercase", p.isCheating ? "bg-red-200 text-red-700" : "bg-primary/5 text-primary")}>
                          {getInitials(p.name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] group-hover:text-primary transition-colors">{p.avatar}</p>
                      <p className="text-sm font-bold text-slate-900 truncate w-32 leading-none">{p.name.split(',')[0]}</p>
                      {room.status === 'active' && <p className="text-2xl font-black text-primary pt-2">{p.score}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <footer className="h-14 bg-white border-t flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-12 z-20">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-primary/30" />
            <span>IES LA SALLE URUBAMBA</span>
          </div>
          <div className="font-bold">
            Desarrollado por <span className="text-primary italic">Rodolfo Riveros</span>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b pb-10">
        <div className="space-y-5">
          <Button variant="ghost" onClick={() => router.back()} className="h-9 text-primary font-bold px-0 hover:bg-transparent uppercase tracking-widest text-[9px] gap-2">
            <ArrowLeft className="h-4 w-4" /> VOLVER AL REGISTRO AUXILIAR
          </Button>
          <div className="flex items-center gap-5">
            <div className="p-5 bg-primary rounded-[2rem] text-white shadow-2xl shadow-primary/30">
              <Zap className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Rank-UP</h2>
              <p className="text-slate-400 font-medium italic text-base mt-2">Plataforma de Gamificación Técnica Salle</p>
            </div>
          </div>
        </div>

        {!roomCode ? (
          <Button onClick={handleLaunchRoom} disabled={isSyncing} className="h-20 px-16 bg-primary hover:bg-primary/95 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/30 gap-4 transition-all active:scale-95">
            {isSyncing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Radio className="h-6 w-6 animate-pulse" />} ABRIR SALA DE ASCENSO
          </Button>
        ) : (
          <div className="flex items-center gap-4 bg-white border-2 border-primary/5 p-5 rounded-[2.5rem] shadow-2xl">
            <div className="flex flex-col px-8 border-r">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">CÓDIGO ACTIVO</span>
              <span className="text-5xl font-black font-mono text-primary tracking-widest">{roomCode}</span>
            </div>
            <Button onClick={() => setIsFullscreen(true)} className="bg-primary text-white h-20 px-12 rounded-[1.8rem] font-black uppercase text-xs tracking-widest gap-3 shadow-2xl shadow-primary/20 transition-transform hover:scale-105 active:scale-95">
              <Maximize2 className="h-5 w-5" /> PROYECTAR ARENA
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <Card className="p-12 border-none shadow-2xl bg-white rounded-[4rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-primary to-blue-400" />
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800">Banco de Preguntas Rank-UP</h3>
              <Badge variant="outline" className="px-6 py-2 rounded-full border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest bg-primary/5">
                {config?.configuracion_json?.questions?.length || 0} PREGUNTAS TÉCNICAS
              </Badge>
            </div>
            
            <div className="space-y-10">
              {(config?.configuracion_json?.questions || []).map((q: any, idx: number) => (
                <div key={`view-q-${idx}`} className="p-10 bg-slate-50/50 rounded-[3.5rem] border-2 border-slate-100 space-y-8 group hover:border-primary/20 transition-all shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3">
                       <Badge className="bg-primary text-white font-black text-[10px] px-5 py-1 rounded-full uppercase tracking-widest">FASE {idx + 1}</Badge>
                       <p className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-tight max-w-2xl">{q.text}</p>
                    </div>
                    <div className="flex flex-col items-center bg-white p-4 rounded-3xl border shadow-sm shrink-0">
                      <Clock className="h-5 w-5 text-primary mb-1" />
                      <span className="font-black text-lg text-slate-900">{q.timeLimit}s</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((opt: string, oIdx: number) => (
                      <div key={`view-q-${idx}-opt-${oIdx}`} className={cn(
                        "p-6 rounded-2xl border-2 text-xs font-bold uppercase transition-all shadow-sm flex items-center gap-4",
                        q.correctIndex === oIdx ? "bg-emerald-50 border-emerald-500/30 text-emerald-700 ring-4 ring-emerald-500/5" : "bg-white border-slate-50 text-slate-400"
                      )}>
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 font-black text-[10px]", q.correctIndex === oIdx ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-100 text-slate-200")}>
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
          <Card className="p-10 border-none shadow-2xl bg-slate-50 rounded-[3.5rem] sticky top-28">
            <h4 className="text-xl font-black uppercase tracking-tighter mb-10 flex items-center gap-3 text-slate-900">
              <BookOpen className="h-6 w-6 text-primary" /> Contexto Pedagógico
            </h4>
            {config && (
              <div className="space-y-8">
                <div className="p-8 bg-white rounded-[2.5rem] border-2 border-slate-100 space-y-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Indicador de Logro</span>
                  <Badge className="bg-primary text-white font-black px-4 py-1.5 rounded-xl block w-fit shadow-lg shadow-primary/20">{config.indicador_codigo}</Badge>
                  <p className="text-sm font-bold text-slate-700 uppercase leading-relaxed tracking-tight">{config.indicador_desc}</p>
                </div>

                <div className="space-y-5">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Criterios Técnicos Evaluados</span>
                  <div className="grid gap-3">
                    {(config.configuracion_json?.criteria || []).map((c: any, i: number) => (
                      <div key={`crit-${i}`} className="flex items-center gap-5 p-5 bg-white rounded-2xl border-2 border-slate-100 group hover:border-primary/30 transition-all shadow-sm">
                         <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-black text-sm shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">{i + 1}</div>
                         <p className="text-[11px] font-bold text-slate-600 uppercase tracking-tight leading-tight">{c.description || c.category}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 text-center border-t">
                   <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                     <ShieldCheck className="h-4 w-4 text-primary/40" /> IES LA SALLE URUBAMBA
                   </div>
                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">
                     Desarrollado por <span className="text-primary/60 italic">Rodolfo Riveros</span>
                   </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
