
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useFirestore } from "@/firebase"
import { doc, onSnapshot, updateDoc, increment, setDoc, getDoc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Timer, Trophy, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function StudentGameRoomPage() {
  const params = useParams()
  const router = useRouter()
  const firestore = useFirestore()
  const roomId = params.roomId as string

  const [room, setRoom] = React.useState<any>(null)
  const [participant, setParticipant] = React.useState<any>(null)
  const [answered, setAnswered] = React.useState(false)
  const [lastResult, setLastResult] = React.useState<'correct' | 'wrong' | null>(null)
  const [timeLeft, setTimeLeft] = React.useState(0)

  // 1. Obtener datos de la sala y del participante local
  React.useEffect(() => {
    const studentId = localStorage.getItem('quiz_student_id')
    if (!studentId) {
      router.push('/student/quiz/join')
      return
    }

    const unsubscribeRoom = onSnapshot(doc(firestore, 'quizz_rooms', roomId), (snap) => {
      const data = snap.data()
      if (data) {
        setRoom(data)
        // Resetear estado al cambiar de pregunta
        if (data.status === 'active') {
          setAnswered(false)
          setLastResult(null)
          setTimeLeft(data.questions[data.currentQuestionIndex].timeLimit)
        }
      }
    })

    const unsubscribePart = onSnapshot(doc(firestore, 'quizz_rooms', roomId, 'participants', studentId), (snap) => {
      setParticipant(snap.data())
    })

    return () => {
      unsubscribeRoom()
      unsubscribePart()
    }
  }, [roomId, firestore, router])

  // Timer logic
  React.useEffect(() => {
    if (room?.status === 'active' && timeLeft > 0 && !answered) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft, room?.status, answered])

  const handleAnswer = async (index: number) => {
    if (answered || timeLeft <= 0) return
    
    setAnswered(true)
    const currentQ = room.questions[room.currentQuestionIndex]
    const isCorrect = index === currentQ.correctIndex
    setLastResult(isCorrect ? 'correct' : 'wrong')

    const studentId = localStorage.getItem('quiz_student_id')
    if (studentId) {
      const partRef = doc(firestore, 'quizz_rooms', roomId, 'participants', studentId)
      if (isCorrect) {
        await updateDoc(partRef, { score: increment(10) })
      }
      // Registrar respuesta para analítica
      const ansRef = doc(firestore, 'quizz_rooms', roomId, 'participants', studentId, 'answers', `q-${room.currentQuestionIndex}`)
      await setDoc(ansRef, {
        questionIndex: room.currentQuestionIndex,
        answerIndex: index,
        isCorrect,
        criterionId: currentQ.criterionId,
        timestamp: new Date().toISOString()
      })
    }
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-white font-black uppercase text-xs tracking-widest opacity-50">Conectando con la sala...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-6 overflow-hidden relative">
      {/* HUD Superior */}
      <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl mb-8 z-10">
         <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black">
               {participant?.name?.[0] || 'U'}
            </div>
            <div>
               <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Estudiante</p>
               <p className="text-sm font-black text-white uppercase">{participant?.name}</p>
            </div>
         </div>
         <div className="text-right">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Puntaje</p>
            <p className="text-2xl font-black text-white font-mono">{participant?.score || 0}</p>
         </div>
      </div>

      <main className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full z-10">
         {room.status === 'lobby' ? (
           <div className="text-center space-y-6">
              <div className="p-8 bg-primary/20 rounded-[3rem] inline-block animate-pulse">
                 <Loader2 className="h-16 w-16 text-primary animate-spin" />
              </div>
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Esperando al Docente</h2>
              <p className="text-blue-100/40 font-bold uppercase text-[10px] tracking-widest">El juego comenzará en cualquier momento...</p>
           </div>
         ) : room.status === 'active' ? (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-end">
                 <Badge className="bg-white/10 text-white/60 border-none uppercase text-[9px] px-3 font-black">PREGUNTA {room.currentQuestionIndex + 1}</Badge>
                 <div className={`flex items-center gap-2 font-black text-2xl font-mono ${timeLeft < 5 ? 'text-red-500 animate-bounce' : 'text-white'}`}>
                    <Timer className="h-6 w-6" /> {timeLeft}s
                 </div>
              </div>
              
              <h3 className="text-3xl md:text-5xl font-black text-white leading-tight uppercase italic tracking-tighter">
                {room.questions[room.currentQuestionIndex].text}
              </h3>

              <div className="grid gap-4">
                 {room.questions[room.currentQuestionIndex].options.map((opt: string, i: number) => (
                   <Button 
                    key={i} 
                    onClick={() => handleAnswer(i)}
                    disabled={answered || timeLeft <= 0}
                    className={`h-20 text-xl font-black rounded-3xl border-2 transition-all justify-start px-8 uppercase italic tracking-tighter ${
                      answered 
                        ? i === room.questions[room.currentQuestionIndex].correctIndex 
                          ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900' 
                          : 'bg-white/5 border-white/5 text-white/20'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:scale-[1.02]'
                    }`}
                   >
                     <span className="mr-4 text-white/30">{i + 1}.</span> {opt}
                   </Button>
                 ))}
              </div>

              {lastResult && (
                <div className={`p-6 rounded-[2rem] text-center animate-in zoom-in-95 ${lastResult === 'correct' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'bg-red-600/20 text-red-400 border border-red-600/30'}`}>
                   {lastResult === 'correct' ? (
                     <div className="flex items-center justify-center gap-3">
                        <CheckCircle2 className="h-8 w-8" />
                        <span className="text-xl font-black uppercase italic">¡Excelente! +10 puntos</span>
                     </div>
                   ) : (
                     <div className="flex items-center justify-center gap-3">
                        <XCircle className="h-8 w-8" />
                        <span className="text-xl font-black uppercase italic">Incorrecto...</span>
                     </div>
                   )}
                </div>
              )}
           </div>
         ) : (
           <div className="text-center space-y-8 animate-in zoom-in-95">
              <div className="p-10 bg-emerald-600/20 rounded-[4rem] inline-block border border-emerald-600/30">
                 <Trophy className="h-24 w-24 text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none">¡Felicidades!</h2>
                <p className="text-emerald-400 font-bold uppercase text-sm tracking-[0.3em]">Misión Completada</p>
              </div>
              <div className="bg-white/5 p-8 rounded-3xl border border-white/10 max-w-xs mx-auto">
                 <p className="text-[10px] font-black text-blue-200/50 uppercase tracking-widest mb-1">Puntaje Final</p>
                 <p className="text-6xl font-black text-white font-mono">{participant?.score || 0}</p>
              </div>
              <Button onClick={() => router.push('/instructor')} variant="ghost" className="text-white/40 hover:text-white font-bold uppercase text-[10px] tracking-widest">Volver al Portal</Button>
           </div>
         )}
      </main>
    </div>
  )
}
