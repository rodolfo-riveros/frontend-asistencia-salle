
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Sparkles, Trophy, CheckCircle2, XCircle, Gamepad2, ArrowLeft, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useQuery, useMutation } from "convex/react"
import { api as convexApi } from "@/../convex/_generated/api"
import { Badge } from "@/components/ui/badge"

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

  // Reset answer state when question changes
  React.useEffect(() => {
    setHasAnswered(false)
  }, [room?.currentQuestionIndex])

  if (!room) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-6">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest opacity-50 text-center">Sincronizando con el servidor de La Salle...</p>
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 flex flex-col">
      <header className="flex justify-between items-center mb-6 md:mb-10 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-2 md:p-3 bg-primary rounded-xl md:rounded-2xl text-white shadow-lg">
            <Gamepad2 className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Sallé Quizz</h2>
            <p className="text-primary font-bold text-[7px] md:text-[8px] uppercase tracking-widest mt-1">Conexión Live</p>
          </div>
        </div>
        <Badge variant="outline" className="h-8 md:h-10 px-4 md:px-6 rounded-lg md:rounded-xl border-primary/20 bg-white font-black text-primary text-[8px] md:text-[10px] uppercase tracking-widest shrink-0">
          Q {room.currentQuestionIndex + 1} / {room.questions.length}
        </Badge>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center max-w-5xl mx-auto w-full">
        {room.status === 'lobby' ? (
          <div className="text-center space-y-6 md:space-y-8 animate-in fade-in duration-700 w-full">
            <div className="p-10 md:p-16 bg-white rounded-[2rem] md:rounded-[3rem] border-4 border-primary/10 shadow-2xl space-y-6">
               <div className="relative inline-block">
                 <div className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl opacity-20 animate-pulse" />
                 <Trophy className="h-24 w-24 md:h-32 md:w-32 text-yellow-400 mx-auto mb-4 relative z-10" />
               </div>
               <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter">¡Listo para el desafío!</h3>
               <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] max-w-xs mx-auto leading-relaxed">
                 Mantén esta pantalla abierta. El docente iniciará la competencia pronto.
               </p>
            </div>
          </div>
        ) : room.status === 'active' ? (
          <div className="w-full space-y-8 md:space-y-12 animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-4 px-2">
               <h1 className="text-2xl md:text-6xl font-black text-slate-900 text-center leading-tight tracking-tighter uppercase italic drop-shadow-sm">
                 {currentQ.text}
               </h1>
               <div className="flex justify-center items-center gap-2 text-slate-400">
                 <Clock className="h-4 w-4" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Tiempo: {currentQ.timeLimit}s</span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full max-w-4xl mx-auto px-2">
              {currentQ.options.map((opt: string, i: number) => (
                <Button 
                  key={i} 
                  disabled={hasAnswered}
                  onClick={() => handleAnswer(i)}
                  className={`h-20 md:h-36 text-sm md:text-lg font-black uppercase rounded-2xl md:rounded-[2.5rem] border-4 shadow-xl transition-all whitespace-normal px-4 py-2 text-center flex items-center justify-center ${
                    hasAnswered ? 'opacity-40 grayscale pointer-events-none' : 'hover:scale-105 active:scale-95'
                  } ${
                    i === 0 ? 'bg-white border-red-500 text-red-600' : 
                    i === 1 ? 'bg-white border-blue-500 text-blue-600' : 
                    i === 2 ? 'bg-white border-yellow-500 text-yellow-600' : 
                    'bg-white border-emerald-500 text-emerald-600'
                  }`}
                >
                  {opt}
                </Button>
              ))}
            </div>
            
            {hasAnswered && (
              <div className="text-center animate-in slide-in-from-bottom-4 duration-500">
                <div className="inline-flex items-center gap-2 bg-primary text-white h-10 md:h-12 px-6 md:px-10 rounded-full border-none uppercase font-black tracking-widest italic shadow-xl shadow-primary/20 text-[10px] md:text-xs">
                  <CheckCircle2 className="h-4 w-4" /> Respuesta enviada
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-8 md:space-y-10 animate-in fade-in duration-1000 w-full px-2">
            <div className="p-10 md:p-16 bg-white rounded-[2rem] md:rounded-[3rem] border-4 border-emerald-100 shadow-2xl space-y-8">
              <Trophy className="h-32 w-32 md:h-40 md:w-40 text-yellow-400 mx-auto animate-bounce" />
              <div className="space-y-2">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter">¡Buen trabajo!</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px] px-4">Tus resultados han sido sincronizados con el registro oficial</p>
              </div>
              <Button onClick={() => router.push('/')} variant="outline" className="w-full h-14 md:h-16 border-2 border-primary/20 text-primary hover:bg-primary/5 rounded-xl md:rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-sm">
                <ArrowLeft className="h-4 w-4 mr-2" /> VOLVER AL PORTAL
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center text-[8px] md:text-[9px] font-black uppercase text-slate-300 tracking-[0.3em] mt-8">
        IES La Salle Urubamba • Excelencia Tecnológica
      </footer>
    </div>
  )
}
