"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, Users, Gamepad2, Sparkles, 
  Loader2, RefreshCcw, Radio, Zap, CheckCircle2,
  Target,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { useMutation, useQuery } from "convex/react"
import { api as convexApi } from "@convex/_generated/api"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function InstructorQuizPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const periodoId = searchParams.get('periodo_id') || "ACTUAL"

  const [loadingConfig, setLoadingConfig] = React.useState(true)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [config, setConfig] = React.useState<any>(null)
  const [roomCode, setRoomCode] = React.useState<string | null>(null)

  // Convex
  const createRoom = useMutation(convexApi.rooms.createRoom)
  const updateStatus = useMutation(convexApi.rooms.updateStatus)
  const room = useQuery(convexApi.rooms.getRoom, roomCode ? { roomCode } : "skip")

  const fetchSession = React.useCallback(async () => {
    try {
      const data = await api.get<any>(`/evaluaciones/config/${params.id}/${periodoId}`)
      const quizEval = data.evaluaciones?.find((ev: any) => ev.tipo === 'quizz')
      if (quizEval) {
        setConfig(quizEval)
        // Buscamos si ya hay una sesión activa en FastAPI
        const activeSession = await api.get<any>(`/gamificacion/sesion/${quizEval.id}/`).catch(() => null)
        if (activeSession && activeSession.room_code) {
          setRoomCode(activeSession.room_code)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingConfig(false)
    }
  }, [params.id, periodoId])

  React.useEffect(() => { fetchSession() }, [fetchSession])

  const handleLaunchRoom = async () => {
    if (!config || !config.configuracion_json?.questions) return
    setIsSyncing(true)
    try {
      // 1. Aseguramos sesión en FastAPI si no existe
      let session = await api.get<any>(`/gamificacion/sesion/${config.id}/`).catch(() => null)
      if (!session) {
        session = await api.post<any>('/gamificacion/sesion/', {
          evaluacion_id: config.id,
          configuracion_json: config.configuracion_json
        })
      }

      // 2. Abrimos la sala en Convex
      await createRoom({
        roomCode: session.room_code,
        questions: config.configuracion_json.questions,
        configId: config.id,
        unidadId: params.id as string
      })

      setRoomCode(session.room_code)
      toast({ title: "¡Sala en Vivo!", description: `Código de acceso: ${session.room_code}` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Fallo al lanzar la sala." })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSyncToFastApi = async () => {
    if (!room?.participants || !roomCode) return
    setIsSyncing(true)
    try {
      const session = await api.get<any>(`/gamificacion/sesion/${config.id}/`)
      const payload = {
        notas: room.participants.map((p: any) => ({
          alumno_id: p.name,
          aciertos: p.answers?.filter((a: any) => a.isCorrect).length || 0,
          total_preguntas: config.configuracion_json.questions.length
        }))
      }
      await api.post(`/gamificacion/sesion/${session.sesion_id}/finalizar/`, payload)
      await updateStatus({ roomCode, status: 'finished' })
      toast({ title: "Notas Sincronizadas", description: "El registro auxiliar ha sido actualizado." })
      router.push(`/instructor/grades/${params.id}?periodo_id=${periodoId}`)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de Sincronización", description: e.message })
    } finally {
      setIsSyncing(false)
    }
  }

  if (loadingConfig) {
    return <div className="h-screen flex flex-col items-center justify-center gap-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="font-black uppercase text-xs text-slate-400">Cargando Monitor...</p></div>
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b pb-8">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="h-9 text-primary font-bold px-0 hover:bg-transparent uppercase tracking-widest text-[10px]">
            <ArrowLeft className="mr-2 h-4 w-4" /> VOLVER AL PANEL
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-accent rounded-3xl text-white shadow-2xl shadow-accent/20"><Gamepad2 className="h-10 w-10" /></div>
            <div>
              <h2 className="text-3xl md:text-4xl font-headline font-black text-slate-900 uppercase italic">Control de Gamificación</h2>
              <p className="text-slate-500 font-medium italic text-sm">Lanzamiento y sincronización en tiempo real</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {!roomCode ? (
            <Button onClick={handleLaunchRoom} disabled={isSyncing} className="h-16 px-10 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-3">
              {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5" />} Abrir Sala Live
            </Button>
          ) : (
            <div className="flex items-center gap-4 bg-slate-900 p-4 px-8 rounded-3xl text-white shadow-2xl">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-blue-300 tracking-[0.2em] mb-1">PIN DE ACCESO</span>
                <span className="text-4xl font-black font-mono tracking-[0.2em] leading-none">{roomCode}</span>
              </div>
              <div className="h-10 w-px bg-white/10 mx-4" />
              {room?.status === 'lobby' && (
                <Button onClick={() => updateStatus({ roomCode, status: 'active' })} className="bg-emerald-600 hover:bg-emerald-700 h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest">Iniciar Juego</Button>
              )}
              {room?.status === 'active' && (
                <Button onClick={handleSyncToFastApi} disabled={isSyncing} className="bg-primary h-14 px-8 rounded-2xl font-black uppercase text-[10px] gap-2 shadow-xl shadow-primary/20">
                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Finalizar y Sincronizar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <Card className="p-10 border-none shadow-2xl bg-white rounded-[3rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-accent" />
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800">Monitor de Estudiantes</h3>
              {roomCode && <Badge className={cn("h-10 px-6 font-black uppercase text-[10px]", room?.status === 'active' ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-100 text-emerald-700')}>
                {room?.status === 'lobby' ? '● ESPERANDO CONEXIONES' : '● DESAFÍO EN CURSO'}
              </Badge>}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {room?.participants?.map((p: any) => (
                <div key={p._id} className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 flex flex-col items-center gap-4 hover:border-accent/20 transition-all shadow-sm">
                   <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-2xl border-2 border-white">{p.name[0]}</div>
                   <div className="text-center w-full">
                     <p className="text-xs font-black uppercase text-slate-700 truncate mb-1">{p.name}</p>
                     <Badge variant="outline" className="text-[10px] font-black border-accent/20 text-accent bg-accent/5">{p.answers?.filter((a: any) => a.isCorrect).length || 0} Correctas</Badge>
                   </div>
                </div>
              ))}
              {(!room?.participants || room.participants.length === 0) && (
                <div className="col-span-full py-24 text-center space-y-4">
                  <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-300 uppercase font-black text-xs tracking-[0.3em]">Esperando alumnos con el PIN...</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-10 border-none shadow-2xl bg-white rounded-[3rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary/20" />
            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-3">
                 <div className="p-3 bg-primary/10 rounded-2xl text-primary"><FileText className="h-6 w-6" /></div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800">Banco de Preguntas Técnicas</h3>
               </div>
               <Badge variant="outline" className="font-black text-primary border-primary/20 bg-primary/5 uppercase text-[9px] tracking-widest px-4 py-1.5 rounded-full">
                 Indicador: {config?.indicador_codigo || 'N/A'}
               </Badge>
            </div>
            
            <div className="space-y-6">
              {config?.configuracion_json?.questions?.map((q: any, idx: number) => (
                <div key={idx} className="p-8 bg-slate-50/50 rounded-[2rem] border-2 border-slate-100/50 space-y-6">
                  <div className="flex justify-between items-start">
                    <p className="text-lg font-black text-slate-800 leading-tight uppercase tracking-tight max-w-[85%]">{idx + 1}. {q.text}</p>
                    <Badge className="bg-slate-200 text-slate-600 border-none font-bold text-[9px]">{q.timeLimit}s</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options.map((opt: string, oIdx: number) => (
                      <div key={oIdx} className={cn(
                        "p-4 rounded-2xl border-2 flex items-center justify-between transition-all",
                        q.correctIndex === oIdx 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" 
                          : "bg-white border-slate-100 text-slate-500 opacity-80"
                      )}>
                        <span className="text-xs font-bold uppercase">{opt}</span>
                        {q.correctIndex === oIdx && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card className="p-10 border-none shadow-xl bg-slate-900 text-white rounded-[3rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Zap className="h-32 w-32" /></div>
            <h4 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3"><Zap className="text-yellow-400 h-6 w-6" /> Origen Pedagógico</h4>
            {config && (
              <div className="space-y-6">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-2 backdrop-blur-sm">
                  <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest">INDICADOR DE LOGRO</span>
                  <div className="flex items-start gap-3">
                     <Badge className="bg-blue-600 text-white font-black text-[10px] rounded-lg shrink-0">{config.indicador_codigo}</Badge>
                     <p className="text-xs font-bold text-blue-50 leading-relaxed italic">{config.indicador_desc}</p>
                  </div>
                </div>
                
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-2 backdrop-blur-sm">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">ACTIVIDAD VINCULADA</span>
                  <p className="text-base font-black uppercase leading-tight text-white/90">{config.nombre}</p>
                </div>

                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4 backdrop-blur-sm">
                  <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                    <Target className="h-3 w-3" /> CRITERIOS TÉCNICOS EVALUADOS
                  </span>
                  <div className="space-y-3">
                    {config.configuracion_json?.criteria?.map((c: any, i: number) => (
                      <div key={i} className="flex gap-3 text-[11px] text-white/60 items-start group">
                        <span className="font-black text-white/90 shrink-0 bg-white/10 w-5 h-5 rounded-md flex items-center justify-center group-hover:bg-yellow-400/20 group-hover:text-yellow-400 transition-all">{i + 1}</span>
                        <span className="italic leading-relaxed group-hover:text-white/80 transition-all">{c.description || c.category}</span>
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
