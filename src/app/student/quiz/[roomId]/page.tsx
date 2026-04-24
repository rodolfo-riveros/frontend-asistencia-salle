
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
  
  // Estado local para que el alumno avance a su ritmo
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

  // Detector de trampas (al salir de la pestaña)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (participantId) {
        reportCheat({ participantId, isCheating: document.visibilityState === 'hidden' })
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [participantId, reportCheat])

  // Preparar opciones cuando cambia la pregunta local
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
        <Loader2 className="h-16 w-16 animate-spin text-primary opacity-20" />
        <Zap className="h-8 w-8 text-primary absolute inset-0 m-auto animate-pulse" />
      </div>
      <p className="text-slate-400 font-black uppercase text-[11px] tracking-[0.4em] text-center max-w-[200px] leading-relaxed">
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
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#003366', '#FFD700']
      });
    } else {
      setShakeScreen(true)
      setTimeout(() => setShakeScreen(false), 500)
    }

    try {
      await submitAnswer({
        roomCode: params.roomId as string,
        participantId,
        questionIndex: localQuestionIndex,
        isCorrect: isCorrect
      })
      
      // Esperar 1.5 segundos para mostrar feedback y pasar a la siguiente
      setTimeout(() => {
        if (localQuestionIndex + 1 < room.questions.length) {
          setLocalQuestionIndex(prev => prev + 1)
        } else {
          setIsQuizFinished(true)
        }
      }, 1500)

    } catch (e) {
      console.error("Error enviando respuesta:", e)
    }
  }

  return (
    <div className={cn(
      "min-h-screen bg-[#f8f9fa] p-4 flex flex-col justify-between overflow-hidden transition-all duration-500",
      shakeScreen && "animate-shake bg-red-500/10"
    )}>
      {/* Barra de Progreso Superior */}
      <div className="absolute top-0 left-0 w-full h-2 bg-primary/10">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_15px_rgba(0,51,102,0.5)]" 
          style={{ width: `${((localQuestionIndex + (hasAnswered ? 1 : 0)) / (room.questions?.length || 1)) * 100}%` }} 
        />
      </div>

      <header className="flex justify-between items-center max-w-4xl mx-auto w-full mb-6 mt-4 animate-in slide-in-from-top-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white border-2 border-primary/10 rounded-xl shadow-lg">
            <Zap className="h-5 w-5 text-primary fill-primary" />
          </div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Rank-UP</h2>
        </div>
        <Badge className="h-10 px-4 rounded-xl bg-white border-2 border-primary/5 text-primary font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2">
          FASE {Math.min(localQuestionIndex + 1, room.questions.length)} / {room.questions.length}
        </Badge>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center max-w-5xl mx-auto w-full">
        {room.status === 'lobby' ? (
          <div className="text-center space-y-8 animate-in zoom-in-95 duration-700 w-full">
            <div className="p-10 md:p-16 bg-white/70 backdrop-blur-2xl rounded-[3rem] border-b-[8px] border-primary shadow-2xl space-y-8 relative overflow-hidden">
               <Trophy className="h-24 w-24 text-yellow-400 mx-auto animate-bounce drop-shadow-xl" />
               <div className="space-y-4">
                 <h3 className="text-3xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter">¡En Espera!</h3>
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] max-w-xs mx-auto leading-relaxed">
                   El docente iniciará el ascenso técnico en breve. No cierres esta ventana.
                 </p>
               </div>
            </div>
          </div>
        ) : (room.status === 'active' && !isQuizFinished) ? (
          <div className="w-full space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-6">
               <h1 className="text-2xl md:text-5xl font-black text-slate-900 leading-tight uppercase italic tracking-tighter px-4">
                 {currentQ?.text}
               </h1>
               <div className="inline-flex items-center gap-3 bg-white/80 px-6 py-2 rounded-full shadow-xl border border-primary/5">
                 <Clock className="h-4 w-4 text-primary animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Tiempo Salle: {currentQ?.timeLimit}s</span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mx-auto">
              {shuffledOptions.map((opt, i) => (
                <Button 
                  key={`opt-${i}`} 
                  disabled={hasAnswered}
                  onClick={() => handleAnswer(opt.originalIndex)}
                  className={cn(
                    "h-24 md:h-32 text-sm md:text-lg font-black uppercase rounded-3xl border-4 transition-all shadow-lg whitespace-normal p-6",
                    hasAnswered ? "opacity-40 grayscale" : "hover:scale-[1.02] active:scale-95",
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
              <div className="text-center animate-in slide-in-from-bottom-8">
                <Badge className={cn(
                  "h-16 px-8 rounded-2xl uppercase font-black tracking-widest shadow-xl text-white text-xs border-4 border-white/20",
                  lastAnswerCorrect ? "bg-emerald-600" : "bg-red-600"
                )}>
                  {lastAnswerCorrect ? "¡ASCENSO EXITOSO!" : "¡SIGUE PREPARÁNDOTE!"}
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-8 animate-in zoom-in-95 w-full">
            <div className="p-12 md:p-20 bg-white rounded-[3.5rem] border-t-[10px] border-emerald-500 shadow-2xl space-y-8 relative overflow-hidden">
              <Trophy className="h-32 w-32 text-yellow-400 mx-auto animate-bounce drop-shadow-2xl" />
              <div className="space-y-3">
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 uppercase italic tracking-tighter">Prueba Finalizada</h2>
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Espera a que el docente proyecte el podio oficial.</p>
              </div>
              <Button onClick={() => router.push('/')} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-transform active:scale-95">
                Volver al Inicio
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full text-center space-y-2 pb-6 pt-8 px-4">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3 w-3 text-primary opacity-30" />
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
            IES LA SALLE URUBAMBA
          </p>
        </div>
        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
          Desarrollado por <span className="text-primary/50 italic">Rodolfo Riveros</span>
        </p>
      </footer>
    </div>
  )
}
