
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Trophy, CheckCircle2, Zap, Clock, ShieldCheck, UserX, XCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useQuery, useMutation } from "convex/react"
import { api as convexApi } from "@convex/_generated/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"

export default function StudentGameRoomPage() {
  const params = useParams()
  const router = useRouter()
  const [participantId, setParticipantId] = React.useState<string | null>(null)
  const [hasAnswered, setHasAnswered] = React.useState(false)
  const [shuffledOptions, setShuffledOptions] = React.useState<{text: string, originalIndex: number}[]>([])
  const [lastAnswerCorrect, setLastAnswerCorrect] = React.useState<boolean | null>(null)
  const [shakeScreen, setShakeScreen] = React.useState(false)

  const room = useQuery(convexApi.rooms.getRoom, { roomCode: params.roomId as string })
  const submitAnswer = useMutation(convexApi.rooms.submitAnswer)
  const reportCheat = useMutation(convexApi.rooms.reportCheat)

  React.useEffect(() => {
    const pId = localStorage.getItem(`p_${params.roomId}`)
    if (!pId) router.push('/student/quiz/join')
    else setParticipantId(pId)
  }, [params.roomId, router])

  // Detector de trampas
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (participantId) {
        reportCheat({ participantId, isCheating: document.visibilityState === 'hidden' })
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [participantId, reportCheat])

  // Mezclar opciones y resetear estados por pregunta
  React.useEffect(() => {
    if (room?.status === 'active') {
      const currentQ = room.questions[room.currentQuestionIndex]
      if (currentQ) {
        const options = currentQ.options.map((opt: string, i: number) => ({ text: opt, originalIndex: i }))
        setShuffledOptions([...options].sort(() => Math.random() - 0.5))
        setHasAnswered(false)
        setLastAnswerCorrect(null)
      }
    }
  }, [room?.currentQuestionIndex, room?.status, room?.questions])

  if (!room) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-8 p-10 font-body">
      <div className="relative">
        <Loader2 className="h-16 w-16 animate-spin text-primary opacity-20" />
        <Zap className="h-8 w-8 text-primary absolute inset-0 m-auto animate-pulse" />
      </div>
      <p className="text-slate-400 font-black uppercase text-[11px] tracking-[0.4em] text-center max-w-[200px] leading-relaxed">
        Sincronizando Arena Rank-UP...
      </p>
    </div>
  )

  const currentQ = room.questions[room.currentQuestionIndex]

  const handleAnswer = async (originalIndex: number) => {
    if (hasAnswered || !participantId) return
    
    const isCorrect = originalIndex === currentQ.correctIndex
    setHasAnswered(true)
    setLastAnswerCorrect(isCorrect)

    if (isCorrect) {
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.7 },
        colors: ['#003366', '#00AEEF', '#FFD700', '#FFFFFF'],
        gravity: 1.2
      });
    } else {
      setShakeScreen(true)
      setTimeout(() => setShakeScreen(false), 500)
    }

    try {
      await submitAnswer({
        roomCode: params.roomId as string,
        participantId,
        questionIndex: room.currentQuestionIndex,
        isCorrect: isCorrect
      })
    } catch (e) {
      console.error("Error enviando respuesta:", e)
    }
  }

  return (
    <div className={cn(
      "min-h-screen bg-[#f8f9fa] p-6 flex flex-col justify-between overflow-hidden transition-all duration-500 font-body",
      shakeScreen && "animate-shake bg-red-500/10"
    )}>
      {/* UI Elements */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/10">
        {room.status === 'active' && (
          <div 
            className="h-full bg-primary transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(0,51,102,0.5)]" 
            style={{ width: `${((room.currentQuestionIndex + 1) / room.questions.length) * 100}%` }} 
          />
        )}
      </div>

      <header className="flex justify-between items-center max-w-4xl mx-auto w-full mb-10 mt-4 animate-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white border-2 border-primary/10 rounded-2xl shadow-xl">
            <Zap className="h-6 w-6 text-primary fill-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Rank-UP</h2>
            <p className="text-primary font-black text-[8px] uppercase tracking-[0.3em] mt-1.5">Salle Arena Live</p>
          </div>
        </div>
        <Badge className="h-12 px-6 rounded-2xl bg-white border-2 border-primary/5 text-primary font-black text-[12px] uppercase tracking-widest shadow-xl flex items-center gap-3">
          <Sparkles className="h-4 w-4" /> FASE {room.currentQuestionIndex + 1} / {room.questions.length}
        </Badge>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center max-w-5xl mx-auto w-full">
        {room.status === 'lobby' ? (
          <div className="text-center space-y-8 animate-in zoom-in-95 duration-700 w-full">
            <div className="p-12 md:p-20 bg-white/70 backdrop-blur-2xl rounded-[4rem] border-b-[12px] border-primary shadow-[0_45px_100px_-20px_rgba(0,0,0,0.15)] space-y-10 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
               <Trophy className="h-32 w-32 text-yellow-400 mx-auto animate-bounce drop-shadow-2xl" />
               <div className="space-y-4 relative z-10">
                 <h3 className="text-4xl md:text-6xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">¡Prepárate!</h3>
                 <div className="h-1.5 w-16 bg-primary/20 mx-auto rounded-full" />
                 <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em] max-w-xs mx-auto leading-relaxed mt-4">
                   El docente iniciará el ascenso técnico Salle en breve.
                 </p>
               </div>
            </div>
          </div>
        ) : room.status === 'active' ? (
          <div className="w-full space-y-12 animate-in fade-in duration-500">
            <div className="text-center space-y-8">
               <h1 className="text-3xl md:text-6xl font-black text-slate-900 leading-[1.1] uppercase italic drop-shadow-sm px-4 tracking-tighter">
                 {currentQ.text}
               </h1>
               <div className="inline-flex items-center gap-4 bg-white/80 backdrop-blur-md px-8 py-3 rounded-full shadow-2xl border-2 border-primary/5">
                 <Clock className="h-5 w-5 text-primary animate-pulse" />
                 <span className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-600">Tiempo Salle: {currentQ.timeLimit}s</span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
              {shuffledOptions.map((opt, i) => (
                <Button 
                  key={`opt-btn-${i}`} 
                  disabled={hasAnswered}
                  onClick={() => handleAnswer(opt.originalIndex)}
                  className={cn(
                    "h-28 md:h-40 text-lg md:text-xl font-black uppercase rounded-[2.5rem] border-4 transition-all shadow-xl whitespace-normal p-8 leading-tight",
                    hasAnswered ? "opacity-30 grayscale cursor-default" : "hover:scale-[1.03] active:scale-95 hover:shadow-2xl",
                    i === 0 ? "bg-white border-red-500/20 text-red-600 shadow-red-500/5" : 
                    i === 1 ? "bg-white border-blue-500/20 text-blue-600 shadow-blue-500/5" : 
                    i === 2 ? "bg-white border-yellow-500/20 text-yellow-600 shadow-yellow-500/5" : 
                    "bg-white border-emerald-500/20 text-emerald-600 shadow-emerald-500/5"
                  )}
                >
                  {opt.text}
                </Button>
              ))}
            </div>
            
            {hasAnswered && (
              <div className="text-center animate-in slide-in-from-bottom-12 duration-700">
                <Badge className={cn(
                  "h-20 px-12 rounded-[2rem] uppercase font-black tracking-[0.25em] shadow-2xl text-white text-base border-4 border-white/20",
                  lastAnswerCorrect ? "bg-emerald-600 shadow-emerald-500/30" : "bg-red-600 shadow-red-500/30"
                )}>
                  {lastAnswerCorrect ? (
                    <div className="flex items-center gap-4"><CheckCircle2 className="h-8 w-8" /> ¡ASCENSO EXITOSO!</div>
                  ) : (
                    <div className="flex items-center gap-4"><XCircle className="h-8 w-8" /> ¡Sigue preparándote!</div>
                  )}
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-12 animate-in zoom-in-95 duration-1000 w-full">
            <div className="p-16 md:p-24 bg-white rounded-[4rem] border-t-[14px] border-emerald-500 shadow-[0_50px_100px_-25px_rgba(0,0,0,0.2)] space-y-12 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
              <Trophy className="h-40 w-40 text-yellow-400 mx-auto animate-bounce drop-shadow-2xl" />
              <div className="space-y-4">
                <h2 className="text-5xl md:text-7xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Cima Alcanzada</h2>
                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[12px] mt-6">Revisa el podio en la pantalla principal.</p>
              </div>
              <Button onClick={() => router.push('/')} className="w-full h-20 py-8 bg-primary text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-primary/20 transition-transform active:scale-95">
                Finalizar Desafío
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full text-center space-y-3 pb-8 pt-12 px-6 z-10">
        <div className="flex items-center justify-center gap-3">
          <ShieldCheck className="h-4 w-4 text-primary opacity-30" />
          <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">
            IES LA SALLE URUBAMBA
          </p>
        </div>
        <div className="h-px w-10 bg-slate-200 mx-auto" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Desarrollado por <span className="text-primary font-black italic">Rodolfo Riveros</span>
        </p>
      </footer>
    </div>
  )
}
