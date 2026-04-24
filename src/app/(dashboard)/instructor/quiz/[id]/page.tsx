"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, Gamepad2, Sparkles, 
  Loader2, Radio, Users, Maximize2, Play, Trophy, ShieldCheck, UserX, Crown
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
        } catch (e) { console.log("No active session found") }
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de Carga" })
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
    toast({ title: "¡Salle Challenge Iniciado!" })
  }

  const handleFinishGame = async () => {
    if (!roomCode || !sessionId) return
    await updateStatus({ roomCode, status: 'finished' })
    
    const results = room?.participants?.map(p => ({
      alumno_id: p.name, // Ajustar según lógica de ID real
      puntaje: p.score
    })) || []

    try {
      await api.post(`/gamificacion/sesion/${sessionId}/finalizar/`, { notas: results })
      toast({ title: "Notas sincronizadas" })
    } catch (e) { toast({ variant: "destructive", title: "Error sincronizando notas" }) }
  }

  const sortedParticipants = React.useMemo(() => {
    return [...(room?.participants || [])].sort((a, b) => b.score - a.score)
  }, [room?.participants])

  if (loadingConfig) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (isFullscreen && roomCode) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-500 overflow-hidden">
        <div className="h-2 bg-primary w-full" />
        <div className="flex-grow flex flex-col lg:flex-row">
          <div className="w-full lg:w-[450px] bg-slate-50 p-12 flex flex-col justify-between border-r">
            <div className="space-y-10">
              <div className="flex items-center gap-4">
                <Gamepad2 className="h-10 w-10 text-primary" />
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">Salle Live</h2>
              </div>

              <div className="bg-white p-10 rounded-[3rem] shadow-xl text-center space-y-6">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">PIN DE ACCESO</p>
                 <h3 className="text-8xl font-black text-primary font-mono">{roomCode}</h3>
                 <div className="p-4 bg-slate-50 rounded-2xl inline-block border-2 border-slate-100">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${window.location.origin}/student/quiz/join?pin=${roomCode}`} className="w-40 h-40" alt="QR" />
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Alumnos: {room?.participants?.length || 0}</span>
                <Button variant="ghost" onClick={() => setIsFullscreen(false)} className="text-[9px] font-bold uppercase">Cerrar Pantalla Completa</Button>
              </div>
              {room.status === 'lobby' ? (
                <Button onClick={handleStartGame} disabled={!room?.participants?.length} className="w-full h-20 bg-primary text-white rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20">
                  INICIAR DESAFÍO
                </Button>
              ) : room.status === 'active' ? (
                <Button onClick={handleFinishGame} className="w-full h-20 bg-accent text-white rounded-[2rem] font-black text-lg shadow-xl">
                  FINALIZAR Y VER PODIO
                </Button>
              ) : (
                <Button onClick={() => setIsFullscreen(false)} className="w-full h-20 bg-slate-800 text-white rounded-[2rem] font-black text-lg">
                  SALIR DEL JUEGO
                </Button>
              )}
            </div>
          </div>

          <div className="flex-grow p-16 bg-white overflow-y-auto">
            {room.status === 'finished' ? (
              <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95">
                <h2 className="text-6xl font-black uppercase italic tracking-tighter text-slate-900 mb-20">Podio de Honor</h2>
                <div className="flex items-end gap-8">
                  {/* Segundo Puesto */}
                  {sortedParticipants[1] && (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-32 w-32 border-4 border-slate-200 shadow-xl"><AvatarFallback className="text-2xl font-black bg-slate-100">{getInitials(sortedParticipants[1].name)}</AvatarFallback></Avatar>
                        <div className="absolute -top-4 -right-4 h-12 w-12 bg-slate-300 rounded-full flex items-center justify-center font-black text-white text-xl border-4 border-white shadow-lg">2</div>
                      </div>
                      <span className="font-black uppercase text-sm text-slate-600">{sortedParticipants[1].name.split(',')[0]}</span>
                      <div className="h-40 w-32 bg-slate-100 rounded-t-3xl border-t-4 border-slate-200" />
                    </div>
                  )}
                  {/* Primero Puesto */}
                  {sortedParticipants[0] && (
                    <div className="flex flex-col items-center gap-4">
                      <Crown className="h-12 w-12 text-yellow-400 animate-bounce" />
                      <div className="relative">
                        <Avatar className="h-44 w-44 border-8 border-yellow-400 shadow-2xl scale-110"><AvatarFallback className="text-4xl font-black bg-yellow-50">{getInitials(sortedParticipants[0].name)}</AvatarFallback></Avatar>
                        <div className="absolute -top-6 -right-6 h-16 w-16 bg-yellow-400 rounded-full flex items-center justify-center font-black text-white text-3xl border-8 border-white shadow-xl">1</div>
                      </div>
                      <span className="font-black uppercase text-xl text-slate-900">{sortedParticipants[0].name.split(',')[0]}</span>
                      <div className="h-60 w-44 bg-yellow-400/10 rounded-t-[3rem] border-t-8 border-yellow-400 flex flex-col items-center pt-8">
                        <span className="text-2xl font-black text-yellow-600">{sortedParticipants[0].score}</span>
                        <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">PUNTOS</span>
                      </div>
                    </div>
                  )}
                  {/* Tercer Puesto */}
                  {sortedParticipants[2] && (
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-28 w-28 border-4 border-amber-600/30 shadow-xl"><AvatarFallback className="text-xl font-black bg-amber-50">{getInitials(sortedParticipants[2].name)}</AvatarFallback></Avatar>
                        <div className="absolute -top-4 -right-4 h-10 w-10 bg-amber-700/60 rounded-full flex items-center justify-center font-black text-white text-lg border-4 border-white shadow-lg">3</div>
                      </div>
                      <span className="font-black uppercase text-sm text-slate-500">{sortedParticipants[2].name.split(',')[0]}</span>
                      <div className="h-32 w-28 bg-amber-50 rounded-t-2xl border-t-4 border-amber-600/20" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-8">
                {room?.participants?.map((p: any) => (
                  <div key={p._id} className={cn(
                    "flex flex-col items-center gap-3 p-6 rounded-[2.5rem] border-2 transition-all group",
                    p.isCheating ? "border-red-500 bg-red-50 animate-pulse shadow-red-100 shadow-xl" : "border-slate-50 hover:border-primary/20"
                  )}>
                    <div className="relative">
                      <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                        <AvatarFallback className={cn("text-xl font-black", p.isCheating ? "bg-red-200 text-red-700" : "bg-blue-50 text-primary")}>
                          {getInitials(p.name)}
                        </AvatarFallback>
                      </Avatar>
                      {p.isCheating && <div className="absolute -top-2 -right-2 h-8 w-8 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white"><UserX className="h-4 w-4" /></div>}
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-slate-400 group-hover:text-primary">{p.avatar}</p>
                      <p className="text-xs font-bold text-slate-900 truncate w-24">{p.name.split(',')[0]}</p>
                      {room.status === 'active' && <p className="text-lg font-black text-primary mt-1">{p.score}</p>}
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
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b pb-10">
        <div className="space-y-5">
          <Button variant="ghost" onClick={() => router.back()} className="h-9 text-primary font-bold px-0 hover:bg-transparent uppercase tracking-widest text-[9px] gap-2">
            <ArrowLeft className="h-4 w-4" /> VOLVER AL REGISTRO AUXILIAR
          </Button>
          <div className="flex items-center gap-5">
            <div className="p-4.5 bg-primary rounded-[1.8rem] text-white shadow-xl">
              <Gamepad2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter">Salle Quizz Live</h2>
              <p className="text-slate-400 font-medium italic text-base mt-1">Desafío técnico en tiempo real</p>
            </div>
          </div>
        </div>

        {!roomCode ? (
          <Button onClick={handleLaunchRoom} disabled={isSyncing} className="h-18 px-12 bg-primary hover:bg-primary/95 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-3 transition-all active:scale-95">
            {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5 animate-pulse" />} ABRIR SALA LIVE
          </Button>
        ) : (
          <div className="flex items-center gap-4 bg-white border-2 border-primary/5 p-4 rounded-[2rem] shadow-xl">
            <div className="flex flex-col px-6">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">CÓDIGO ACTIVO</span>
              <span className="text-4xl font-black font-mono text-primary tracking-widest">{roomCode}</span>
            </div>
            <Button onClick={() => setIsFullscreen(true)} className="bg-primary text-white h-16 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/15 transition-transform hover:scale-105">
              <Maximize2 className="h-4 w-4" /> PROYECTAR LOBBY
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <Card className="p-12 border-none shadow-[0_30px_70px_rgba(0,0,0,0.05)] bg-white rounded-[3.5rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-blue-400" />
            <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800 mb-12">Cuestionario Técnico</h3>
            <div className="space-y-8">
              {(config?.configuracion_json?.questions || []).map((q: any, idx: number) => (
                <div key={`view-q-${idx}`} className="p-8 bg-slate-50/50 rounded-[2.5rem] border-2 border-slate-100 space-y-6">
                  <div className="flex justify-between">
                    <p className="text-lg font-black text-slate-800 uppercase tracking-tight">{q.text}</p>
                    <Badge className="bg-white text-primary h-fit">{q.timeLimit}s</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt: string, oIdx: number) => (
                      <div key={`view-q-${idx}-opt-${oIdx}`} className={cn(
                        "p-4 rounded-xl border-2 text-[11px] font-bold uppercase",
                        q.correctIndex === oIdx ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-50 text-slate-400"
                      )}>
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
          <Card className="p-10 border-none shadow-xl bg-slate-50 rounded-[3rem]">
            <h4 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3 text-slate-900">Origen Pedagógico</h4>
            {config && (
              <div className="space-y-6">
                <div className="p-6 bg-white rounded-3xl border-2 border-slate-100 space-y-3">
                  <Badge className="bg-primary text-white font-black">{config.indicador_codigo}</Badge>
                  <p className="text-xs font-bold text-slate-700 uppercase leading-relaxed">{config.indicador_desc}</p>
                </div>
              </div>
            )}
          </Card>
          
          <div className="p-8 text-center space-y-4">
             <div className="flex items-center justify-center gap-2 text-[9px] font-black uppercase text-slate-300 tracking-[0.2em]">
               <ShieldCheck className="h-3 w-3" /> IES LA SALLE URUBAMBA
             </div>
             <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
               Desarrollado por Rodolfo Riveros
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
