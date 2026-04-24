
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
  
  const [localQuestionIndex, setLocalQuestionIndex] = React.useState(0)
  const [hasAnswered, setHasAnswered] = React.useState(false)
  const [shuffledOptions, setShuffledOptions] = React.useState<{text: string, originalIndex: number}[]>([])
  const [lastAnswerCorrect, setLastAnswerCorrect] = React.useState<boolean | null>(null)
  const [shakeScreen, setShakeScreen] = React.useState(false)
  const [isQuizFinished, setIsQuizFinished] = React.useState(false)

  const room = useQuery(convexApi.rooms.getRoom, { roomCode: params.roomId as string })
  const submitAnswer = useMutation(convexApi.rooms.submitAnswer)
  const reportCheat = useMutation(convexApi.rooms.reportCheat)

  React.useEffect(() => {
    const pId = localStorage.getItem(`p_${params.roomId}`)
    if (!pId) router.push('/student/quiz/join')
    else setParticipantId(pId)
  }, [params.roomId, router])

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (participantId) {
        reportCheat({ participantId, isCheating: document.visibilityState === 'hidden' })
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [participantId, reportCheat])

  React.useEffect(() => {
    if (room?.status === 'active' && room.questions) {
      const currentQ = room.questions[localQuestionIndex]
      if (currentQ) {
        const options = currentQ.options.map((opt: string, i: number) => ({ text: opt, originalIndex: i }))
        setShuffledOptions([...options].sort(() => Math.random() - 0.5))
        setHasAnswered(false)
        setLastAnswerCorrect(null)
      } else if (localQuestionIndex >= room.questions.length) {
        setIsQuizFinished(true)
      }
    }
  }, [localQuestionIndex, room?.status, room?.questions])

  if (!room) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-8 p-10">
      <div className="relative">
        <Loader2 className="h-20 w-20 animate-spin text-primary opacity-20" />
        <Zap className="h-10 w-10 text-primary absolute inset-0 m-auto animate-pulse" />
      </div>
      <p className="text-slate-400 font-black uppercase text-[12px] tracking-[0.5em] text-center max-w-[250px] leading-relaxed">
        Sincronizando Arena Rank-UP...
      </p>
    </div>
  )

  const currentQ = room.questions[localQuestionIndex]

  const handleAnswer = async (originalIndex: number) => {
    if (hasAnswered || !participantId || !currentQ) return
    
    const isCorrect = originalIndex === currentQ.correctIndex
    setHasAnswered(true)
    setLastAnswerCorrect(isCorrect)

    if (isCorrect) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.8 },
        colors: ['#2261CB', '#FFD700', '#FFFFFF']
      });
    } else {
      setShakeScreen(true)
      setTimeout(() => setShakeScreen(false), 600)
    }

    try {
      await submitAnswer({
        roomCode: params.roomId as string,
        participantId,
        questionIndex: localQuestionIndex,
        isCorrect: isCorrect
      })
      
      setTimeout(() => {
        if (localQuestionIndex + 1 < room.questions.length) {
          setLocalQuestionIndex(prev => prev + 1)
        } else {
          setIsQuizFinished(true)
        }
      }, 1800)

    } catch (e) {
      console.error("Error enviando respuesta:", e)
    }
  }

  return (
    <div className={cn(
      "min-h-screen bg-[#f8f9fa] p-4 flex flex-col justify-between overflow-hidden transition-all duration-700",
      shakeScreen && "animate-shake bg-red-600/10"
    )}>
      <div className="absolute top-0 left-0 w-full h-3 bg-primary/10">
        <div 
          className="h-full bg-primary transition-all duration-700 ease-out shadow-[0_0_25px_rgba(34,97,203,0.6)]" 
          style={{ width: `${((localQuestionIndex + (hasAnswered ? 1 : 0)) / (room.questions?.length || 1)) * 100}%` }} 
        />
      </div>

      <header className="flex justify-between items-center max-w-5xl mx-auto w-full mb-8 mt-6 animate-in slide-in-from-top-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white border-2 border-primary/10 rounded-2xl shadow-xl">
            <Zap className="h-6 w-6 text-primary fill-primary" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Rank-UP</h2>
        </div>
        <Badge className="h-12 px-6 rounded-2xl bg-white border-2 border-primary/5 text-primary font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3">
          <Sparkles className="h-4 w-4" /> FASE {Math.min(localQuestionIndex + 1, room.questions.length)} / {room.questions.length}
        </Badge>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center max-w-6xl mx-auto w-full">
        {room.status === 'lobby' ? (
          <div className="text-center space-y-12 animate-in zoom-in-95 duration-1000 w-full px-4">
            <div className="p-12 md:p-24 bg-white/80 backdrop-blur-3xl rounded-[4rem] border-b-[12px] border-primary shadow-2xl space-y-10 relative overflow-hidden">
               <Trophy className="h-32 w-32 text-yellow-400 mx-auto animate-bounce drop-shadow-2xl" />
               <div className="space-y-6">
                 <h3 className="text-4xl md:text-7xl font-black text-slate-900 uppercase italic tracking-tighter">¡En Espera!</h3>
                 <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.5em] max-w-md mx-auto leading-relaxed">
                   El docente activará la arena en breve. Mantente enfocado.
                 </p>
               </div>
            </div>
          </div>
        ) : (room.status === 'active' && !isQuizFinished) ? (
          <div className="w-full space-y-12 animate-in fade-in duration-700 px-4">
            <div className="text-center space-y-8">
               <h1 className="text-3xl md:text-6xl font-black text-slate-900 leading-tight uppercase italic tracking-tighter max-w-4xl mx-auto">
                 {currentQ?.text}
               </h1>
               <div className="inline-flex items-center gap-4 bg-white/90 px-8 py-3 rounded-full shadow-2xl border-2 border-primary/5">
                 <Clock className="h-5 w-5 text-primary animate-pulse" />
                 <span className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-600">Tiempo Salle: {currentQ?.timeLimit}s</span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto">
              {shuffledOptions.map((opt, i) => (
                <Button 
                  key={`opt-${i}`} 
                  disabled={hasAnswered}
                  onClick={() => handleAnswer(opt.originalIndex)}
                  className={cn(
                    "h-28 md:h-40 text-base md:text-2xl font-black uppercase rounded-[2.5rem] border-4 transition-all shadow-xl whitespace-normal p-8",
                    hasAnswered ? "opacity-30 grayscale" : "hover:scale-[1.03] active:scale-95 hover:shadow-2xl",
                    i === 0 ? "bg-white border-red-500/20 text-red-600" : 
                    i === 1 ? "bg-white border-blue-500/20 text-blue-600" : 
                    i === 2 ? "bg-white border-yellow-500/20 text-yellow-600" : 
                    "bg-white border-emerald-500/20 text-emerald-600"
                  )}
                >
                  {opt.text}
                </Button>
              ))}
            </div>
            
            {hasAnswered && (
              <div className="text-center animate-in slide-in-from-bottom-12 duration-500">
                <div className={cn(
                  "inline-flex items-center gap-4 h-20 px-12 rounded-[2rem] uppercase font-black tracking-[0.2em] shadow-2xl text-white text-sm border-4 border-white/30",
                  lastAnswerCorrect ? "bg-emerald-600" : "bg-red-600"
                )}>
                  {lastAnswerCorrect ? (
                    <><CheckCircle2 className="h-6 w-6" /> ¡ASCENSO EXITOSO!</>
                  ) : (
                    <><XCircle className="h-6 w-6" /> ¡SIGUE PREPARÁNDOTE!</>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-12 animate-in zoom-in-95 w-full px-4">
            <div className="p-16 md:p-24 bg-white rounded-[5rem] border-t-[14px] border-emerald-500 shadow-2xl space-y-10 relative overflow-hidden">
              <Trophy className="h-40 w-40 text-yellow-400 mx-auto animate-bounce drop-shadow-2xl" />
              <div className="space-y-4">
                <h2 className="text-5xl md:text-8xl font-black text-slate-900 uppercase italic tracking-tighter">Desafío Logrado</h2>
                <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[12px]">Espera el veredicto oficial en el monitor del docente.</p>
              </div>
              <Button onClick={() => router.push('/')} className="w-full h-20 bg-primary text-white rounded-[2rem] font-black uppercase text-sm tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-xl">
                Volver al Inicio
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full text-center space-y-3 pb-8 pt-10 px-4">
        <div className="flex items-center justify-center gap-3">
          <ShieldCheck className="h-4 w-4 text-primary opacity-30" />
          <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">
            IES LA SALLE URUBAMBA
          </p>
        </div>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
          Desarrollado por <span className="text-primary/50 italic">Rodolfo Riveros</span>
        </p>
      </footer>
    </div>
  )
}
