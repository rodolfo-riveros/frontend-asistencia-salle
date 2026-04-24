
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Trophy, CheckCircle2, Zap, Clock, ShieldCheck, UserX, XCircle } from "lucide-react"
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-8">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] text-center">Sincronizando con Rank-UP...</p>
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
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#003366', '#00AEEF', '#FFD700']
      });
    } else {
      setShakeScreen(true)
      setTimeout(() => setShakeScreen(false), 400)
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
      "min-h-screen bg-[#f8f9fa] p-6 flex flex-col justify-between overflow-hidden transition-all duration-300",
      shakeScreen && "animate-shake bg-red-50/50"
    )}>
      <header className="flex justify-between items-center max-w-4xl mx-auto w-full mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary rounded-xl text-white shadow-lg">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic leading-none">Rank-UP</h2>
            <p className="text-primary font-bold text-[7px] uppercase tracking-widest mt-1">Live Challenge</p>
          </div>
        </div>
        <Badge variant="outline" className="h-10 px-4 rounded-xl border-primary/10 bg-white font-black text-primary text-[10px] uppercase tracking-widest shadow-sm">
          Fase {room.currentQuestionIndex + 1} / {room.questions.length}
        </Badge>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
        {room.status === 'lobby' ? (
          <div className="text-center space-y-8 animate-in zoom-in-95 duration-700 w-full">
            <div className="p-10 md:p-16 bg-white rounded-[3rem] border-b-8 border-primary shadow-xl space-y-8">
               <Trophy className="h-24 w-24 text-yellow-400 mx-auto animate-pulse" />
               <div className="space-y-2">
                 <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">¡Listo para subir!</h3>
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] max-w-xs mx-auto leading-relaxed">
                   El docente iniciará el desafío Rank-UP en cualquier momento. ¡Prepárate!
                 </p>
               </div>
            </div>
          </div>
        ) : room.status === 'active' ? (
          <div className="w-full space-y-10 animate-in fade-in duration-500">
            <div className="text-center space-y-6">
               <h1 className="text-2xl md:text-5xl font-black text-slate-900 leading-tight uppercase italic drop-shadow-sm px-4">
                 {currentQ.text}
               </h1>
               <div className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full shadow-sm border">
                 <Clock className="h-4 w-4 text-primary animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tiempo: {currentQ.timeLimit}s</span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {shuffledOptions.map((opt, i) => (
                <Button 
                  key={`opt-${i}`} 
                  disabled={hasAnswered}
                  onClick={() => handleAnswer(opt.originalIndex)}
                  className={cn(
                    "h-24 md:h-36 text-base font-black uppercase rounded-[1.8rem] border-2 transition-all shadow-md whitespace-normal",
                    hasAnswered ? "opacity-30 grayscale cursor-default" : "hover:scale-[1.02] active:scale-95",
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
              <div className="text-center animate-in slide-in-from-bottom-10 duration-500">
                <Badge className={cn(
                  "h-16 px-10 rounded-2xl uppercase font-black tracking-widest shadow-xl text-white text-sm",
                  lastAnswerCorrect ? "bg-emerald-600" : "bg-red-600"
                )}>
                  {lastAnswerCorrect ? (
                    <div className="flex items-center gap-3"><CheckCircle2 className="h-6 w-6" /> ¡EXCELENTE ASCENSO!</div>
                  ) : (
                    <div className="flex items-center gap-3"><XCircle className="h-6 w-6" /> ¡SIGUE INTENTANDO!</div>
                  )}
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-10 animate-in zoom-in-95 duration-1000 w-full">
            <div className="p-10 md:p-16 bg-white rounded-[3.5rem] border-t-8 border-emerald-500 shadow-2xl space-y-10">
              <Trophy className="h-32 w-32 text-yellow-400 mx-auto animate-bounce" />
              <div className="space-y-3">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter">Rank-UP Finalizado</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Mira quién alcanzó la cima en la pantalla principal.</p>
              </div>
              <Button onClick={() => router.push('/')} className="w-full h-18 py-6 bg-primary text-white rounded-[1.5rem] font-black uppercase text-xs shadow-lg">
                Salir del Desafío
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full text-center space-y-2 pt-10">
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
