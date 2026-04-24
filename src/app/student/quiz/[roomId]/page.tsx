
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Sparkles, Trophy, CheckCircle2, XCircle, Gamepad2, ArrowLeft } from "lucide-react"
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest opacity-50">Conectando con la sala...</p>
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
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 flex flex-col">
      <div className="flex justify-between items-center mb-10 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary rounded-2xl text-white shadow-lg">
            <Gamepad2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Sallé Quizz</h2>
            <p className="text-primary font-bold text-[8px] uppercase tracking-widest mt-1">Sesión en Vivo</p>
          </div>
        </div>
        <Badge variant="outline" className="h-10 px-6 rounded-xl border-primary/20 bg-white font-black text-primary text-[10px] uppercase tracking-widest">
          PREGUNTA {room.currentQuestionIndex + 1} de {room.questions.length}
        </Badge>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center max-w-5xl mx-auto w-full">
        {room.status === 'lobby' ? (
          <div className="text-center space-y-8 animate-in fade-in duration-700">
            <div className="p-16 bg-white rounded-[3rem] border-4 border-primary/10 shadow-2xl space-y-6">
               <div className="relative inline-block">
                 <div className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl opacity-20 animate-pulse" />
                 <Trophy className="h-32 w-32 text-yellow-400 mx-auto mb-4 relative z-10" />
               </div>
               <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">¡Estás en la sala!</h3>
               <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] max-w-xs mx-auto leading-relaxed">
                 Prepárate. El docente iniciará el desafío en cualquier momento.
               </p>
            </div>
          </div>
        ) : room.status === 'active' ? (
          <div className="w-full space-y-12 animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-4">
               <h1 className="text-4xl md:text-6xl font-black text-slate-900 text-center leading-tight tracking-tighter uppercase italic drop-shadow-sm">
                 {currentQ.text}
               </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
              {currentQ.options.map((opt: string, i: number) => (
                <Button 
                  key={i} 
                  disabled={hasAnswered}
                  onClick={() => handleAnswer(i)}
                  className={`h-28 md:h-36 text-lg font-black uppercase rounded-[2rem] border-4 shadow-xl transition-all ${
                    hasAnswered ? 'opacity-40 grayscale pointer-events-none' : 'hover:scale-105 active:scale-95'
                  } ${
                    i === 0 ? 'bg-white border-red-500 text-red-600 hover:bg-red-50' : 
                    i === 1 ? 'bg-white border-blue-500 text-blue-600 hover:bg-blue-50' : 
                    i === 2 ? 'bg-white border-yellow-500 text-yellow-600 hover:bg-yellow-50' : 
                    'bg-white border-emerald-500 text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  {opt}
                </Button>
              ))}
            </div>
            
            {hasAnswered && (
              <div className="text-center animate-in slide-in-from-bottom-4 duration-500">
                <Badge className="bg-primary text-white h-12 px-10 rounded-full border-none uppercase font-black tracking-widest italic shadow-xl shadow-primary/20">
                  Respuesta enviada. ¡Suerte!
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-10 animate-in fade-in duration-1000">
            <div className="p-16 bg-white rounded-[3rem] border-4 border-emerald-100 shadow-2xl space-y-8">
              <Trophy className="h-40 w-40 text-yellow-400 mx-auto animate-bounce" />
              <div className="space-y-2">
                <h2 className="text-5xl font-black text-slate-900 uppercase italic tracking-tighter">Desafío Finalizado</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Tus resultados se han enviado al registro auxiliar</p>
              </div>
              <Button onClick={() => router.push('/')} variant="outline" className="w-full h-16 border-2 border-primary/20 text-primary hover:bg-primary/5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-sm">
                <ArrowLeft className="h-4 w-4 mr-2" /> VOLVER AL PORTAL
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-[9px] font-black uppercase text-slate-300 tracking-[0.3em] mt-12">
        La Salle Urubamba • Excelencia Tecnológica
      </p>
    </div>
  )
}
