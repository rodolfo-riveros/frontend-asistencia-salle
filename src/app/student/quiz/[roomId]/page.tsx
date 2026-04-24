
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Trophy, CheckCircle2, Zap, Clock, ShieldCheck, XCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useQuery, useMutation } from "convex/react"
import { api as convexApi } from "@convex/_generated/api"
import { Badge } from "@/components/ui/badge"
import { cn, getInitials } from "@/lib/utils"
import confetti from "canvas-confetti"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
  const [timeLeft, setTimeLeft] = React.useState(20)

  const room = useQuery(convexApi.rooms.getRoom, { roomCode: (params.roomId as string).toUpperCase() })
  const submitAnswer = useMutation(convexApi.rooms.submitAnswer)
  const reportCheat = useMutation(convexApi.rooms.reportCheat)

  const myData = React.useMemo(() => {
    if (!room?.participants || !participantId) return null
    return room.participants.find((p: any) => p._id === participantId)
  }, [room?.participants, participantId])

  // Cargar sesión del participante
  React.useEffect(() => {
    const pId = localStorage.getItem(`p_${params.roomId}`)
    if (!pId) router.push('/student/quiz/join')
    else setParticipantId(pId)
  }, [params.roomId, router])

  // Detector de Fraude
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (participantId) {
        reportCheat({ participantId, isCheating: document.visibilityState === 'hidden' })
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [participantId, reportCheat])

  // Lógica de Preguntas y Opciones
  React.useEffect(() => {
    if (room?.status === 'active' && room.questions) {
      const currentQ = room.questions[localQuestionIndex]
      if (currentQ) {
        const options = currentQ.options.map((opt: string, i: number) => ({ text: opt, originalIndex: i }))
        setShuffledOptions([...options].sort(() => Math.random() - 0.5))
        setHasAnswered(false)
        setLastAnswerCorrect(null)
        setTimeLeft(currentQ.timeLimit || 20)
      } else if (localQuestionIndex >= room.questions.length) {
        setIsQuizFinished(true)
      }
    }
  }, [localQuestionIndex, room?.status, room?.questions])

  // Contador de Tiempo
  React.useEffect(() => {
    if (room?.status !== 'active' || isQuizFinished || hasAnswered) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleAnswer(-1) // Tiempo agotado = Incorrecto
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [localQuestionIndex, hasAnswered, room?.status, isQuizFinished])

  const handleAnswer = async (originalIndex: number) => {
    if (hasAnswered || !participantId || !room?.questions) return
    
    const currentQ = room.questions[localQuestionIndex]
    const isCorrect = originalIndex === currentQ?.correctIndex
    setHasAnswered(true)
    setLastAnswerCorrect(isCorrect)

    if (isCorrect) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#2261CB', '#FFD700']
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
      
      // Transición rápida
      setTimeout(() => {
        if (localQuestionIndex + 1 < room.questions.length) {
          setLocalQuestionIndex(prev => prev + 1)
        } else {
          setIsQuizFinished(true)
        }
      }, 1200)

    } catch (e) {
      console.error("Error enviando respuesta:", e)
    }
  }

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

  return (
    <div className={cn(
      "min-h-screen bg-[#f8f9fa] p-4 flex flex-col justify-between overflow-hidden transition-all duration-500 font-body",
      shakeScreen && "animate-shake bg-red-600/5"
    )}>
      {/* Barra de Progreso */}
      <div className="absolute top-0 left-0 w-full h-2 bg-slate-200">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_15px_rgba(34,97,203,0.4)]" 
          style={{ width: `${((localQuestionIndex + (hasAnswered ? 1 : 0)) / (room.questions?.length || 1)) * 100}%` }} 
        />
      </div>

      <header className="flex justify-between items-center max-w-5xl mx-auto w-full mb-6 mt-4 animate-in slide-in-from-top-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white border-2 border-primary/10 rounded-xl shadow-lg">
            <Zap className="h-5 w-5 text-primary fill-primary" />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Rank-UP</h2>
        </div>
        <div className="flex items-center gap-3">
          {myData && (
            <div className="hidden sm:flex items-center gap-2.5 bg-white pr-5 pl-2 py-1 rounded-full border-2 border-primary/5 shadow-md">
              <Avatar className="h-8 w-8 border-2 border-primary/10">
                <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(myData.avatar)}`} />
                <AvatarFallback className="text-[8px] font-black bg-slate-100">{getInitials(myData.name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{myData.avatar}</span>
                <span className="text-[10px] font-black text-slate-900 uppercase leading-none">{myData.name.split(',')[0]}</span>
              </div>
            </div>
          )}
          <Badge className="h-10 px-4 rounded-xl bg-white border-2 border-primary/5 text-primary font-black text-[10px] uppercase tracking-widest shadow-md">
            {Math.min(localQuestionIndex + 1, room.questions.length)} / {room.questions.length}
          </Badge>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center max-w-5xl mx-auto w-full">
        {room.status === 'lobby' ? (
          <div className="text-center space-y-8 animate-in zoom-in-95 duration-700 w-full px-4">
            <div className="p-10 md:p-20 bg-white rounded-[3rem] border-b-[8px] border-primary shadow-xl space-y-8">
               {myData && (
                 <Avatar className="h-32 w-32 mx-auto border-4 border-white shadow-xl scale-110 mb-6">
                   <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(myData.avatar)}`} />
                   <AvatarFallback className="text-3xl font-black bg-primary/5">{getInitials(myData.name)}</AvatarFallback>
                 </Avatar>
               )}
               <div className="space-y-4">
                 <h3 className="text-3xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter">¡En Arena!</h3>
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] max-w-xs mx-auto leading-relaxed">
                   Espera a que el docente inicie el ascenso técnico.
                 </p>
               </div>
            </div>
          </div>
        ) : (room.status === 'active' && !isQuizFinished) ? (
          <div className="w-full space-y-10 animate-in fade-in duration-500 px-4">
            <div className="text-center space-y-6">
               <div className="flex items-center justify-center gap-3 mb-4">
                  <div className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-full border-2 font-black text-sm",
                    timeLeft <= 5 ? "bg-red-50 border-red-500 text-red-600 animate-pulse" : "bg-white border-slate-100 text-slate-400"
                  )}>
                    <Clock className="h-4 w-4" /> {timeLeft}s
                  </div>
               </div>
               <h1 className="text-xl md:text-3xl font-black text-slate-900 leading-snug uppercase italic tracking-tight max-w-3xl mx-auto">
                 {currentQ?.text}
               </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mx-auto">
              {shuffledOptions.map((opt, i) => (
                <Button 
                  key={`opt-${i}`} 
                  disabled={hasAnswered}
                  onClick={() => handleAnswer(opt.originalIndex)}
                  variant="outline"
                  className={cn(
                    "h-24 md:h-28 text-sm md:text-lg font-bold uppercase rounded-2xl border-2 transition-all shadow-md whitespace-normal px-6 py-4 flex items-center justify-start text-left overflow-hidden",
                    !hasAnswered && "hover:border-primary/50 hover:bg-slate-50 hover:scale-[1.01] active:scale-95",
                    hasAnswered && opt.originalIndex === currentQ?.correctIndex && "bg-emerald-500 text-white border-emerald-500 shadow-emerald-200",
                    hasAnswered && opt.originalIndex !== currentQ?.correctIndex && "opacity-40 grayscale"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border-2 font-black text-xs mr-4",
                    hasAnswered && opt.originalIndex === currentQ?.correctIndex ? "bg-white text-emerald-600 border-white" : "bg-slate-50 text-slate-400 border-slate-100"
                  )}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="line-clamp-2">{opt.text}</span>
                </Button>
              ))}
            </div>
            
            {hasAnswered && (
              <div className="text-center animate-in slide-in-from-bottom-4 duration-300">
                <div className={cn(
                  "inline-flex items-center gap-3 h-14 px-8 rounded-xl uppercase font-black tracking-widest shadow-lg text-white text-xs",
                  lastAnswerCorrect ? "bg-emerald-600" : "bg-red-600"
                )}>
                  {lastAnswerCorrect ? (
                    <><CheckCircle2 className="h-5 w-5" /> ¡ACIERTO!</>
                  ) : (
                    <><XCircle className="h-5 w-5" /> ¡FALLO!</>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-10 animate-in zoom-in-95 w-full px-4 max-w-2xl mx-auto">
            <div className="p-12 md:p-16 bg-white rounded-[4rem] border-t-[10px] border-emerald-500 shadow-2xl space-y-10 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
              <div className="relative">
                 <Trophy className="h-28 w-28 text-yellow-400 mx-auto animate-bounce drop-shadow-lg" />
                 <Sparkles className="h-8 w-8 text-yellow-400 absolute top-0 right-1/4 animate-pulse" />
              </div>
              
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Ascenso Terminado</h2>
                <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100 inline-block">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2">PUNTAJE ACUMULADO</p>
                   <span className="text-5xl font-black text-primary font-mono">{myData?.score || 0}</span>
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] pt-4">
                   Héroe: {myData?.avatar || 'Salle'}
                </p>
              </div>

              {room.status === 'finished' ? (
                <Button onClick={() => router.push('/student/quiz/join')} className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95">
                  Volver al Inicio
                </Button>
              ) : (
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Esperando resultados finales del docente...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="w-full text-center space-y-2 pb-6 pt-8 px-4 opacity-50">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3 w-3 text-primary" />
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
            IES LA SALLE URUBAMBA
          </p>
        </div>
      </footer>
    </div>
  )
}
