"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Trophy, CheckCircle2, Gamepad2, ArrowLeft, Clock, ShieldCheck, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useQuery, useMutation } from "convex/react"
import { api as convexApi } from "@/../convex/_generated/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function StudentGameRoomPage() {
  const params = useParams()
  const router = useRouter()
  const [participantId, setParticipantId] = React.useState<string | null>(null)
  const [hasAnswered, setHasAnswered] = React.useState(false)

  const room = useQuery(convexApi.rooms.getRoom, { roomCode: params.roomId as string })
  const submitAnswer = useMutation(convexApi.rooms.submitAnswer)

  React.useEffect(() => {
    const pId = localStorage.getItem(`p_${params.roomId}`)
    if (!pId) router.push('/student/quiz/join')
    else setParticipantId(pId)
  }, [params.roomId, router])

  React.useEffect(() => {
    setHasAnswered(false)
  }, [room?.currentQuestionIndex])

  if (!room) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-8">
      <div className="relative">
        <div className="absolute inset-0 bg-primary rounded-full blur-2xl opacity-10 animate-pulse" />
        <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
      </div>
      <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] text-center max-w-[200px] leading-relaxed">Estableciendo conexión institucional...</p>
    </div>
  )

  const currentQ = room.questions[room.currentQuestionIndex]

  const handleAnswer = async (index: number) => {
    if (hasAnswered || !participantId) return
    setHasAnswered(true)
    try {
      await submitAnswer({
        roomCode: params.roomId as string,
        participantId,
        questionIndex: room.currentQuestionIndex,
        isCorrect: index === currentQ.correctIndex
      })
    } catch (e) {
      console.error("Error enviando respuesta:", e)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 flex flex-col justify-between overflow-hidden">
      <header className="flex justify-between items-center max-w-4xl mx-auto w-full mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl text-white shadow-lg">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic leading-none">Quizz Live</h2>
            <p className="text-primary font-bold text-[7px] uppercase tracking-widest mt-1">La Salle Urubamba</p>
          </div>
        </div>
        <Badge variant="outline" className="h-10 px-4 rounded-xl border-primary/10 bg-white font-black text-primary text-[10px] uppercase tracking-widest shadow-sm">
          Pregunta {room.currentQuestionIndex + 1} / {room.questions.length}
        </Badge>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center max-w-4xl mx-auto w-full relative">
        {room.status === 'lobby' ? (
          <div className="text-center space-y-8 animate-in zoom-in-95 duration-700 w-full">
            <div className="p-10 md:p-16 bg-white rounded-[3rem] border border-primary/5 shadow-[0_30px_60px_rgba(0,0,0,0.04)] space-y-8">
               <div className="relative inline-block">
                 <div className="absolute inset-0 bg-yellow-400 rounded-full blur-[60px] opacity-10 animate-pulse" />
                 <Trophy className="h-32 w-32 text-yellow-400 mx-auto relative z-10" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">¡Estás dentro!</h3>
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.25em] max-w-xs mx-auto leading-relaxed">
                   Espera a que el docente inicie el desafío técnico en el aula.
                 </p>
               </div>
               <div className="flex justify-center gap-1.5">
                  {[1,2,3].map(i => <div key={i} className={`h-1.5 w-1.5 rounded-full bg-primary/20 animate-bounce delay-${i}00`} />)}
               </div>
            </div>
          </div>
        ) : room.status === 'active' ? (
          <div className="w-full space-y-10 animate-in fade-in duration-500">
            <div className="text-center space-y-6">
               <h1 className="text-3xl md:text-5xl font-black text-slate-900 text-center leading-[1.1] tracking-tighter uppercase italic drop-shadow-sm px-4">
                 {currentQ.text}
               </h1>
               <div className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full shadow-sm border border-slate-100">
                 <Clock className="h-4 w-4 text-primary animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Límite: {currentQ.timeLimit}s</span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full px-2">
              {currentQ.options.map((opt: string, i: number) => (
                <Button 
                  key={i} 
                  disabled={hasAnswered}
                  onClick={() => handleAnswer(i)}
                  className={cn(
                    "h-24 md:h-32 text-base font-black uppercase rounded-[1.8rem] border-2 shadow-xl transition-all duration-300 whitespace-normal px-6 py-4 text-center flex items-center justify-center relative overflow-hidden group",
                    hasAnswered ? "opacity-30 grayscale pointer-events-none" : "hover:scale-[1.02] active:scale-95",
                    i === 0 ? "bg-white border-red-500/20 text-red-600 hover:bg-red-50" : 
                    i === 1 ? "bg-white border-blue-500/20 text-blue-600 hover:bg-blue-50" : 
                    i === 2 ? "bg-white border-yellow-500/20 text-yellow-600 hover:bg-yellow-50" : 
                    "bg-white border-emerald-500/20 text-emerald-600 hover:bg-emerald-50"
                  )}
                >
                  <span className="relative z-10">{opt}</span>
                  <div className={cn(
                    "absolute top-0 left-0 w-1.5 h-full opacity-40",
                    i === 0 ? "bg-red-500" : i === 1 ? "bg-blue-500" : i === 2 ? "bg-yellow-500" : "bg-emerald-500"
                  )} />
                </Button>
              ))}
            </div>
            
            {hasAnswered && (
              <div className="text-center animate-in slide-in-from-bottom-6 duration-700">
                <div className="inline-flex items-center gap-3 bg-emerald-500 text-white h-14 px-10 rounded-2xl uppercase font-black tracking-widest shadow-2xl shadow-emerald-200">
                  <CheckCircle2 className="h-5 w-5" /> Respuesta Enviada
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-10 animate-in zoom-in-95 duration-1000 w-full">
            <div className="p-10 md:p-16 bg-white rounded-[3.5rem] border border-emerald-100 shadow-[0_40px_80px_rgba(0,0,0,0.06)] space-y-10">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-yellow-400 rounded-full blur-[80px] opacity-20 animate-pulse" />
                <Trophy className="h-40 w-40 text-yellow-400 mx-auto animate-bounce relative z-10" />
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter">¡Desafío Completo!</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] px-8 leading-relaxed">Tus aciertos técnicos han sido registrados en tu perfil académico.</p>
              </div>
              <Button onClick={() => router.push('/')} className="w-full h-18 py-8 bg-primary hover:bg-primary/95 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30">
                Finalizar Sesión
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-md mx-auto text-center space-y-2 pt-10">
        <div className="flex items-center justify-center gap-2 text-[9px] font-black uppercase text-slate-300 tracking-[0.2em]">
          <ShieldCheck className="h-3 w-3" /> IES LA SALLE URUBAMBA
        </div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          Desarrollado por <span className="text-primary/60">Rodolfo Riveros</span>
        </p>
      </footer>
    </div>
  )
}
