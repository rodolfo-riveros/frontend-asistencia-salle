"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Trophy, CheckCircle2, Zap, Clock, ShieldCheck, XCircle, Sparkles, LogOut, ListChecks, AlertTriangle, BookOpen } from "lucide-react"
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
  
  const [hasAnswered, setHasAnswered] = React.useState(false)
  const [selectedOptionIndex, setSelectedOptionIndex] = React.useState<number | null>(null)
  const [lastAnswerCorrect, setLastAnswerCorrect] = React.useState<boolean | null>(null)
  const [timeLeft, setTimeLeft] = React.useState(20)

  const room = useQuery(convexApi.rooms.getRoom, { roomCode: (params.roomId as string).toUpperCase() })
  const submitAnswer = useMutation(convexApi.rooms.submitAnswer)
  const reportCheat = useMutation(convexApi.rooms.reportCheat)

  const myData = React.useMemo(() => {
    if (!room?.participants || !participantId) return null
    return room.participants.find((p: any) => p._id === participantId)
  }, [room?.participants, participantId])

  const currentQuestionIndex = room?.currentQuestionIndex ?? 0
  const currentQ = room?.questions ? room.questions[currentQuestionIndex] : null
  const isQuizFinished = room?.status === 'finished'

  React.useEffect(() => {
    const pId = localStorage.getItem(`p_${params.roomId}`)
    if (!pId) router.push('/student/quiz/join')
    else setParticipantId(pId)
  }, [params.roomId, router])

  // RESET ENTRE PREGUNTAS (Sincronizado con el índice del docente)
  React.useEffect(() => {
    if (currentQ) {
      // Verificar si ya respondió esta pregunta técnica
      const alreadyResponded = myData?.answers?.find((a: any) => a.questionIndex === currentQuestionIndex);
      
      if (!alreadyResponded) {
        setHasAnswered(false)
        setSelectedOptionIndex(null)
        setLastAnswerCorrect(null)
        setTimeLeft(currentQ.timeLimit || 20)
      } else {
        setHasAnswered(true)
        setSelectedOptionIndex(alreadyResponded.selectedOption)
        setLastAnswerCorrect(alreadyResponded.isCorrect)
      }
    }
  }, [currentQuestionIndex, !!currentQ, myData?.answers?.length])

  // Detección de fraude por cambio de pestaña
  React.useEffect(() => {
    const handleVisibilityChange = () => { 
      if (participantId) reportCheat({ participantId, isCheating: document.visibilityState === 'hidden' }) 
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [participantId, reportCheat])

  // CRONÓMETRO BLINDADO: Se sincroniza únicamente con el índice oficial
  React.useEffect(() => {
    if (room?.status !== 'active' || isQuizFinished || hasAnswered || !currentQ) return
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { 
          clearInterval(timer); 
          handleAnswer(-1); // Tiempo agotado
          return 0; 
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [currentQuestionIndex, hasAnswered, room?.status, isQuizFinished, !!currentQ])

  const handleAnswer = async (originalIndex: number) => {
    if (hasAnswered || !participantId || !currentQ) return
    
    const isCorrect = originalIndex === currentQ.correctIndex
    setHasAnswered(true)
    setSelectedOptionIndex(originalIndex)
    setLastAnswerCorrect(isCorrect)
    
    if (isCorrect) {
      confetti({ 
        particleCount: 80, 
        spread: 70, 
        origin: { y: 0.8 }, 
        colors: ['#2261CB', '#FFD700'] 
      });
    }

    // Persistencia inmediata en Convex
    await submitAnswer({ 
      roomCode: params.roomId as string, 
      participantId, 
      questionIndex: currentQuestionIndex, 
      isCorrect, 
      selectedOption: originalIndex 
    })
  }

  if (!room) return (
    <div className="min-h-screen bg-card flex flex-col items-center justify-center gap-8 p-10">
      <div className="relative"><Loader2 className="h-20 w-20 animate-spin text-primary opacity-20" /><Zap className="h-10 w-10 text-primary absolute inset-0 m-auto animate-pulse" /></div>
      <p className="text-muted-foreground font-black uppercase text-[12px] tracking-[0.5em] text-center">Sincronizando Arena Rank-UP...</p>
    </div>
  )

  const correctsCount = myData?.answers?.filter((a: any) => a.isCorrect).length || 0;
  const incorrectsCount = (myData?.answers?.length || 0) - correctsCount;

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-4 flex flex-col justify-between font-body">
      <div className="absolute top-0 left-0 w-full h-2 bg-slate-200">
        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${((currentQuestionIndex + (hasAnswered ? 1 : 0)) / (room.questions?.length || 1)) * 100}%` }} />
      </div>

      <header className="flex justify-between items-center max-w-5xl mx-auto w-full mb-6 mt-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white border-2 border-primary/10 rounded-xl shadow-lg"><Zap className="h-5 w-5 text-primary fill-primary" /></div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground uppercase italic">{room.configId === "RECOVERY" ? "Recuperación" : "Rank-UP"}</h2>
            {room.configId === "RECOVERY" && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[8px] uppercase tracking-widest px-2 py-1 rounded-lg gap-1">
                <AlertTriangle className="h-3 w-3" /> Curso Jalado
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {myData && (
            <div className="flex items-center gap-2.5 bg-card pr-5 pl-2 py-1 rounded-full border-2 border-primary/5 shadow-md">
              <Avatar className="h-8 w-8"><AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(myData.avatar)}`} /><AvatarFallback className="text-[8px] font-black bg-slate-100">{getInitials(myData.name)}</AvatarFallback></Avatar>
              <span className="text-[10px] font-black text-foreground uppercase truncate w-24">{myData.name.split(',')[0]}</span>
            </div>
          )}
          <Badge className="h-10 px-4 rounded-xl bg-white text-primary font-black text-[10px] uppercase">
            {Math.min(currentQuestionIndex + 1, room.questions.length)} / {room.questions.length}
          </Badge>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center max-w-5xl mx-auto w-full">
        {room.status === 'lobby' ? (
          <div className="text-center p-10 md:p-20 bg-card rounded-[3rem] border-b-[8px] border-primary shadow-xl space-y-8">
             {myData && <Avatar className="h-32 w-32 mx-auto border-4 border-white shadow-xl mb-6"><AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(myData.avatar)}`} /><AvatarFallback className="text-3xl font-black">{getInitials(myData.name)}</AvatarFallback></Avatar>}
             <h3 className="text-3xl md:text-5xl font-black text-foreground uppercase italic tracking-tighter">{room.configId === "RECOVERY" ? "¡Recuperando!" : "¡En Arena!"}</h3>
             <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em]">{room.configId === "RECOVERY" ? "Espera que el docente inicie la recuperación." : "Espera el ascenso técnico del docente."}</p>
          </div>
        ) : (room.status === 'active' && !isQuizFinished) ? (
          <div className="w-full space-y-10 px-4">
            {hasAnswered ? (
              <div className={cn("text-center p-12 md:p-20 rounded-[4rem] border-b-[12px] shadow-2xl space-y-6", lastAnswerCorrect ? "bg-emerald-50 border-emerald-500" : "bg-red-50 border-red-500")}>
                {lastAnswerCorrect ? <CheckCircle2 className="h-24 w-24 text-emerald-500 mx-auto" /> : <XCircle className="h-24 w-24 text-red-500 mx-auto" />}
                <h3 className="text-4xl font-black uppercase italic text-foreground">{lastAnswerCorrect ? "¡LOGRADO!" : "¡SIGUE ASÍ!"}</h3>
                <div className="flex flex-col items-center gap-3"><p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em]">Espera el siguiente reto...</p><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              </div>
            ) : (
              <>
                <div className="text-center space-y-6">
                   <div className={cn("inline-flex items-center gap-2 px-6 py-2 rounded-full border-2 font-black text-sm", timeLeft <= 5 ? "bg-red-50 border-red-500 text-red-600 animate-pulse" : "bg-card border-border text-muted-foreground")}><Clock className="h-4 w-4" /> {timeLeft}s</div>
                   <h1 className="text-xl md:text-2xl font-black text-foreground uppercase italic max-w-3xl mx-auto">{currentQ?.text}</h1>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mx-auto">
                  {currentQ?.options.map((opt: string, i: number) => (
                    <Button key={i} disabled={hasAnswered} onClick={() => handleAnswer(i)} variant="outline" className={cn("min-h-[100px] rounded-3xl border-2 px-8 py-6 flex items-center justify-start text-left whitespace-normal focus-visible:ring-0 focus-visible:ring-offset-0", hasAnswered && selectedOptionIndex === i && (lastAnswerCorrect ? "border-emerald-500 bg-emerald-50" : "border-red-500 bg-red-50"))}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 font-black text-xs mr-5", hasAnswered && selectedOptionIndex === i ? (lastAnswerCorrect ? "bg-emerald-500 text-white" : "bg-red-500 text-white") : "bg-muted text-slate-300")}>{String.fromCharCode(65 + i)}</div>
                      <span className="flex-1 font-black text-foreground/90 leading-tight">{opt}</span>
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto space-y-8 py-6">
            {isQuizFinished ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-card p-8 rounded-[3rem] border-b-[8px] border-emerald-500 shadow-2xl text-center space-y-6">
                  <Trophy className="h-20 w-20 text-yellow-400 mx-auto animate-bounce" />
                  <h2 className="text-4xl font-black text-foreground uppercase italic">{room.configId === "RECOVERY" ? "Recuperación Finalizada" : "Arena Finalizada"}</h2>
                  {room.configId === "RECOVERY" && (
                    <Badge className="bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl gap-2">
                      <BookOpen className="h-4 w-4" /> Recuperación de Curso
                    </Badge>
                  )}
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4">
                    <div className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-100 flex flex-col items-center"><span className="text-[10px] font-black text-emerald-600 uppercase mb-1">Aciertos</span><span className="text-4xl font-black text-emerald-700">{correctsCount}</span></div>
                    <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-100 flex flex-col items-center"><span className="text-[10px] font-black text-red-600 uppercase mb-1">Fallos</span><span className="text-4xl font-black text-red-700">{incorrectsCount}</span></div>
                  </div>
                </div>
                
                {/* PORTAL DE REVISIÓN TÉCNICA (FEEDBACK POST-EXAMEN) */}
                <div className="space-y-6">
                  <h3 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-3 ml-4"><ListChecks className="h-6 w-6 text-primary" /> Revisión Técnica</h3>
                  <div className="grid gap-4">
                    {room.questions.map((q: any, idx: number) => {
                      const ans = myData?.answers?.find((a: any) => a.questionIndex === idx);
                      const isOk = ans?.isCorrect;
                      return (
                        <div key={idx} className={cn("bg-card p-6 rounded-[2rem] border-2 shadow-md flex items-center gap-6", isOk ? "border-emerald-100" : "border-red-100")}>
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black", isOk ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>{isOk ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}</div>
                          <div className="flex-grow space-y-2">
                             <p className="text-sm font-black text-slate-800 uppercase leading-tight">{q.text}</p>
                             {!isOk && <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 w-fit"><span className="text-[10px] font-black text-emerald-600 uppercase">Respuesta Correcta: </span><span className="text-[11px] font-bold text-emerald-700">{q.options[q.correctIndex]}</span></div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <Button onClick={() => router.push('/student/quiz/join')} className="w-full h-20 bg-primary text-white rounded-[2rem] font-black uppercase text-sm shadow-2xl border-b-8 border-primary/20 gap-3"><LogOut className="h-6 w-6" /> VOLVER AL INICIO</Button>
              </div>
            ) : (
              <div className="bg-card p-12 rounded-[4rem] border-t-[14px] border-primary shadow-2xl text-center space-y-12">
                <div className="bg-muted rounded-[3rem] p-10 border-4 border-border inline-block shadow-inner"><p className="text-[12px] font-black uppercase text-muted-foreground tracking-[0.4em] mb-4">PUNTAJE EN ARENA</p><span className="text-6xl md:text-8xl font-black text-primary font-mono">{myData?.score || 0}</span></div>
                <div className="p-8 bg-blue-50 rounded-[2.5rem] border-2 border-blue-100 flex flex-col items-center gap-4"><div className="flex items-center gap-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="text-[11px] font-black text-primary uppercase">Esperando al Docente...</p></div></div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="w-full text-center pb-6 pt-8 opacity-40"><div className="flex items-center justify-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">IES LA SALLE URUBAMBA • {room.configId === "RECOVERY" ? "RECUPERACIÓN" : "RANK-UP"} v2.0</p></div></footer>
    </div>
  )
}
