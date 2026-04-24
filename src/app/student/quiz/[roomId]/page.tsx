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

  // Cargar sesión y sincronizar progreso (Persistencia real)
  React.useEffect(() => {
    const pId = localStorage.getItem(`p_${params.roomId}`)
    if (!pId) {
      router.push('/student/quiz/join')
    } else {
      setParticipantId(pId)
    }
  }, [params.roomId, router])

  // Sincronizar indice de pregunta si ya respondió algunas (Re-ingreso o reconexión)
  React.useEffect(() => {
    if (myData?.answers && room?.questions) {
      const nextIdx = myData.answers.length;
      if (nextIdx >= room.questions.length) {
        setIsQuizFinished(true);
      } else {
        setLocalQuestionIndex(nextIdx);
      }
    }
  }, [myData?.answers, room?.questions])

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

  // Contador de Tiempo Maestro
  React.useEffect(() => {
    if (room?.status !== 'active' || isQuizFinished || hasAnswered) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleAnswer(-1) // Tiempo agotado = Marcar incorrecto y pasar
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
      
      // Transición ultra rápida tras feedback visual
      setTimeout(() => {
        if (localQuestionIndex + 1 < room.questions.length) {
          setLocalQuestionIndex(prev => prev + 1)
        } else {
          setIsQuizFinished(true)
        }
      }, 1000)

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
            <div className="flex items-center gap-2.5 bg-white pr-5 pl-2 py-1 rounded-full border-2 border-primary/5 shadow-md">
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
               <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-snug uppercase italic tracking-tight max-w-3xl mx-auto">
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
                    "min-h-[100px] h-auto text-sm md:text-base font-bold uppercase rounded-3xl border-2 transition-all shadow-md whitespace-normal px-8 py-6 flex items-center justify-start text-left overflow-visible",
                    !hasAnswered && "hover:border-primary hover:bg-white hover:scale-[1.02] active:scale-95 group",
                    hasAnswered && opt.originalIndex === currentQ?.correctIndex && "bg-emerald-500 text-white border-emerald-500 shadow-emerald-200",
                    hasAnswered && opt.originalIndex !== currentQ?.correctIndex && "opacity-40 grayscale"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 font-black text-xs mr-5 transition-colors",
                    hasAnswered && opt.originalIndex === currentQ?.correctIndex ? "bg-white text-emerald-600 border-white" : "bg-slate-50 text-slate-400 border-slate-100 group-hover:border-primary/30"
                  )}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="flex-1 font-black leading-tight text-slate-700 group-hover:text-primary transition-colors">{opt.text}</span>
                </Button>
              ))}
            </div>
            
            {hasAnswered && (
              <div className="text-center animate-in slide-in-from-bottom-4 duration-300">
                <div className={cn(
                  "inline-flex items-center gap-3 h-14 px-10 rounded-2xl uppercase font-black tracking-widest shadow-xl text-white text-sm",
                  lastAnswerCorrect ? "bg-emerald-600" : "bg-red-600"
                )}>
                  {lastAnswerCorrect ? (
                    <><CheckCircle2 className="h-6 w-6" /> ¡ACIERTO ÉPICO!</>
                  ) : (
                    <><XCircle className="h-6 w-6" /> ¡FALLO TÉCNICO!</>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-10 animate-in zoom-in-95 w-full px-4 max-w-2xl mx-auto">
            <div className="p-12 md:p-20 bg-white rounded-[4rem] border-t-[14px] border-emerald-500 shadow-2xl space-y-12 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
              <div className="relative">
                 <Trophy className="h-32 w-32 text-yellow-400 mx-auto animate-bounce drop-shadow-2xl" />
                 <Sparkles className="h-10 w-10 text-yellow-400 absolute top-0 right-1/4 animate-pulse" />
              </div>
              
              <div className="space-y-6">
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Desafío Terminado</h2>
                <div className="bg-slate-50 rounded-[3rem] p-10 border-4 border-slate-100 inline-block shadow-inner">
                   <p className="text-[12px] font-black uppercase text-slate-400 tracking-[0.4em] mb-4">PUNTAJE ACUMULADO</p>
                   <span className="text-6xl md:text-8xl font-black text-primary font-mono tracking-tighter">{myData?.score || 0}</span>
                </div>
                <div className="flex flex-col items-center gap-3 pt-6">
                   <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(myData?.avatar || "salle")}`} />
                      <AvatarFallback className="bg-primary/5 text-primary font-bold">{getInitials(myData?.name || "??")}</AvatarFallback>
                   </Avatar>
                   <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[11px] italic">
                      Héroe Salle: {myData?.avatar || 'Aspirante'}
                   </p>
                </div>
              </div>

              {room.status === 'finished' ? (
                <Button onClick={() => router.push('/student/quiz/join')} className="w-full h-20 bg-primary hover:bg-primary/95 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl transition-all active:scale-95 border-b-8 border-primary-dark">
                  VOLVER AL INICIO
                </Button>
              ) : (
                <div className="p-8 bg-blue-50 rounded-[2.5rem] border-2 border-blue-100 flex flex-col items-center gap-4 shadow-inner">
                  <div className="flex items-center gap-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Esperando resultados oficiales...</p>
                  </div>
                  <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest">NO CIERRES ESTA PANTALLA, ASPIRANTE</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="w-full text-center space-y-2 pb-6 pt-8 px-4 opacity-40">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            IES LA SALLE URUBAMBA • SISTEMA RANK-UP
          </p>
        </div>
      </footer>
    </div>
  )
}
