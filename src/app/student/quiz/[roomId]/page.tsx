"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Trophy, CheckCircle2, Gamepad2, Clock, ShieldCheck, UserX } from "lucide-react"
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
  const [shuffledOptions, setShuffledOptions] = React.useState<{text: string, originalIndex: number}[]>([])

  const room = useQuery(convexApi.rooms.getRoom, { roomCode: params.roomId as string })
  const submitAnswer = useMutation(convexApi.rooms.submitAnswer)
  const reportCheat = useMutation(convexApi.rooms.reportCheat)

  React.useEffect(() => {
    const pId = localStorage.getItem(`p_${params.roomId}`)
    if (!pId) router.push('/student/quiz/join')
    else setParticipantId(pId)
  }, [params.roomId, router])

  // Detector de trampas (Visibility API)
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (participantId) {
        reportCheat({ participantId, isCheating: document.visibilityState === 'hidden' })
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [participantId, reportCheat])

  // Mezclar opciones para evitar copias
  React.useEffect(() => {
    if (room?.status === 'active') {
      const currentQ = room.questions[room.currentQuestionIndex]
      if (currentQ) {
        const options = currentQ.options.map((opt: string, i: number) => ({ text: opt, originalIndex: i }))
        setShuffledOptions([...options].sort(() => Math.random() - 0.5))
        setHasAnswered(false)
      }
    }
  }, [room?.currentQuestionIndex, room?.status, room?.questions])

  if (!room) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-8">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] text-center">Conectando con la sala...</p>
    </div>
  )

  const currentQ = room.questions[room.currentQuestionIndex]

  const handleAnswer = async (originalIndex: number) => {
    if (hasAnswered || !participantId) return
    setHasAnswered(true)
    try {
      await submitAnswer({
        roomCode: params.roomId as string,
        participantId,
        questionIndex: room.currentQuestionIndex,
        isCorrect: originalIndex === currentQ.correctIndex
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
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic leading-none">Live</h2>
            <p className="text-primary font-bold text-[7px] uppercase tracking-widest mt-1">Salle Quizz</p>
          </div>
        </div>
        <Badge variant="outline" className="h-10 px-4 rounded-xl border-primary/10 bg-white font-black text-primary text-[10px] uppercase tracking-widest shadow-sm">
          Pregunta {room.currentQuestionIndex + 1} / {room.questions.length}
        </Badge>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
        {room.status === 'lobby' ? (
          <div className="text-center space-y-8 animate-in zoom-in-95 duration-700 w-full">
            <div className="p-10 md:p-16 bg-white rounded-[3rem] border border-primary/5 shadow-xl space-y-8">
               <Trophy className="h-24 w-24 text-yellow-400 mx-auto animate-pulse" />
               <div className="space-y-2">
                 <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">¡Dentro del juego!</h3>
                 <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] max-w-xs mx-auto">
                   El docente iniciará el desafío pronto. Mantén esta pestaña abierta.
                 </p>
               </div>
            </div>
          </div>
        ) : room.status === 'active' ? (
          <div className="w-full space-y-10 animate-in fade-in duration-500">
            <div className="text-center space-y-6">
               <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight uppercase italic drop-shadow-sm">
                 {currentQ.text}
               </h1>
               <div className="inline-flex items-center gap-3 bg-white px-5 py-2 rounded-full shadow-sm">
                 <Clock className="h-4 w-4 text-primary animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tiempo: {currentQ.timeLimit}s</span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {shuffledOptions.map((opt, i) => (
                <Button 
                  key={i} 
                  disabled={hasAnswered}
                  onClick={() => handleAnswer(opt.originalIndex)}
                  className={cn(
                    "h-24 md:h-32 text-base font-black uppercase rounded-[1.8rem] border-2 transition-all shadow-md whitespace-normal",
                    hasAnswered ? "opacity-30 grayscale" : "hover:scale-[1.02]",
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
              <div className="text-center animate-in slide-in-from-bottom-6">
                <Badge className="bg-emerald-500 text-white h-12 px-8 rounded-2xl uppercase font-black tracking-widest">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Respuesta Enviada
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-10 animate-in zoom-in-95 duration-1000 w-full">
            <div className="p-10 md:p-16 bg-white rounded-[3.5rem] border border-emerald-100 shadow-2xl space-y-10">
              <Trophy className="h-32 w-32 text-yellow-400 mx-auto animate-bounce" />
              <div className="space-y-3">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter">¡Juego Terminado!</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Mira el podio en la pantalla del docente.</p>
              </div>
              <Button onClick={() => router.push('/')} className="w-full h-18 py-6 bg-primary text-white rounded-[1.5rem] font-black uppercase text-xs">
                Cerrar Sesión
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
