
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Sparkles, Trophy, CheckCircle2, XCircle } from "lucide-react"
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

  if (!room) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-white font-black uppercase text-xs tracking-widest opacity-50">Conectando...</p>
    </div>
  )

  const currentQ = room.questions[room.currentQuestionIndex]

  const handleAnswer = async (index: number) => {
    if (hasAnswered || !participantId) return
    setHasAnswered(true)
    await submitAnswer({
      roomCode: params.roomId as string,
      participantId,
      questionIndex: room.currentQuestionIndex,
      isCorrect: index === currentQ.correctIndex
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl"><Sparkles className="h-5 w-5 text-primary" /></div>
          <h2 className="text-white font-black uppercase italic tracking-tighter">Sallé Quizz</h2>
        </div>
        <Badge variant="outline" className="text-white border-white/20">PREGUNTA {room.currentQuestionIndex + 1}/{room.questions.length}</Badge>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
        {room.status === 'lobby' ? (
          <div className="text-center space-y-6">
            <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 animate-pulse">
               <Trophy className="h-20 w-20 text-yellow-400 mx-auto mb-4" />
               <p className="text-white font-black text-xl uppercase italic">¡Estás dentro!</p>
               <p className="text-blue-200/50 text-xs font-bold mt-2 uppercase tracking-widest">Esperando que el docente inicie el desafío</p>
            </div>
          </div>
        ) : room.status === 'active' ? (
          <div className="w-full space-y-10">
            <h1 className="text-3xl md:text-5xl font-black text-white text-center leading-tight tracking-tight uppercase italic">{currentQ.text}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {currentQ.options.map((opt: string, i: number) => (
                <Button 
                  key={i} 
                  disabled={hasAnswered}
                  onClick={() => handleAnswer(i)}
                  className={`h-24 md:h-32 text-lg font-black uppercase rounded-3xl border-2 transition-all ${
                    hasAnswered ? 'opacity-50 grayscale' : 'hover:scale-105 active:scale-95'
                  } ${
                    i === 0 ? 'bg-red-600 border-red-400' : 
                    i === 1 ? 'bg-blue-600 border-blue-400' : 
                    i === 2 ? 'bg-yellow-600 border-yellow-400' : 'bg-emerald-600 border-emerald-400'
                  }`}
                >
                  {opt}
                </Button>
              ))}
            </div>
            {hasAnswered && (
              <div className="text-center animate-in zoom-in duration-300">
                <Badge className="bg-white/10 text-white h-10 px-8 rounded-full border-white/20 uppercase font-black tracking-widest italic">Respuesta enviada. ¡Suerte!</Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-8">
            <Trophy className="h-32 w-32 text-yellow-400 mx-auto animate-bounce" />
            <h2 className="text-4xl font-black text-white uppercase italic italic">Desafío Terminado</h2>
            <Button onClick={() => router.push('/')} variant="outline" className="text-white border-white/20 h-14 px-10 rounded-2xl font-black uppercase">Volver al inicio</Button>
          </div>
        )}
      </div>
    </div>
  )
}
