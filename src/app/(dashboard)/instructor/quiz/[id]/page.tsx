
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Play, 
  Users, 
  Trophy, 
  Gamepad2, 
  Sparkles, 
  QrCode,
  Loader2,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { QuizHeader } from "@/components/quiz/QuizHeader"
import { QuestionEditor } from "@/components/quiz/QuestionEditor"
import { toast } from "@/hooks/use-toast"

// Firebase Mock - En producción usaría initializeFirebase()
const mockRoom = {
  id: "room-123",
  code: "7452",
  status: "lobby",
  participants: [
    { name: "Juan Perez", score: 0 },
    { name: "Maria Gomez", score: 0 },
    { name: "Marcos Ttito", score: 0 }
  ]
}

export default function InstructorQuizPage() {
  const params = useParams()
  const router = useRouter()
  const [view, setView] = React.useState<'setup' | 'game'>('setup')
  const [questions, setQuestions] = React.useState<any[]>([
    { id: "1", text: "¿Qué significa SQL?", options: ["Structured Query Language", "Strong Quick Link", "Style Question List", "System Quality Log"], correctIndex: 0, timeLimit: 20 }
  ])
  const [isLaunching, setIsLaunching] = React.useState(false)

  const handleLaunch = async () => {
    if (questions.length === 0) return toast({ variant: "destructive", title: "Quizz Vacío", description: "Añade al menos una pregunta." })
    setIsLaunching(true)
    // Simulación de creación en Firestore
    await new Promise(r => setTimeout(r, 1000))
    setView('game')
    setIsLaunching(false)
    toast({ title: "Quizz Iniciado", description: "Comparte el código con tus alumnos." })
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="h-9 text-primary font-bold px-0 hover:bg-transparent uppercase tracking-widest text-[10px]">
            <ArrowLeft className="mr-2 h-4 w-4" /> VOLVER AL PANEL
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-accent rounded-3xl text-white shadow-2xl shadow-accent/20">
              <Gamepad2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-4xl font-headline font-black tracking-tight text-slate-900">Gamificación</h2>
              <p className="text-slate-500 font-medium italic">Evaluaciones Interactivas La Salle</p>
            </div>
          </div>
        </div>

        {view === 'setup' && (
          <Button 
            onClick={handleLaunch} 
            disabled={isLaunching}
            className="h-16 px-10 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-3"
          >
            {isLaunching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
            Lanzar Sala de Quizz
          </Button>
        )}
      </div>

      {view === 'setup' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <QuestionEditor questions={questions} onUpdate={setQuestions} />
          </div>
          <div className="space-y-6">
            <Card className="p-8 border-none shadow-xl bg-slate-900 text-white rounded-[2.5rem]">
              <h4 className="text-lg font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
                <Sparkles className="text-yellow-400 h-5 w-5" /> Configuración
              </h4>
              <div className="space-y-6">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                   <p className="text-[11px] text-blue-200/70 leading-relaxed font-medium">
                     "Los alumnos se unirán mediante un código QR o ingresando el PIN de la sala en tiempo real."
                   </p>
                   <div className="flex items-center gap-3 text-emerald-400">
                     <Users className="h-4 w-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Soporta hasta 50 alumnos</span>
                   </div>
                </div>
                <div className="space-y-2">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tema del Quizz</span>
                   <div className="h-12 bg-white/10 rounded-xl flex items-center px-4 font-bold text-sm">
                     Evaluación de Unidad I
                   </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
          <QuizHeader roomCode={mockRoom.code} participantCount={mockRoom.participants.length} status="lobby" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <Card className="p-10 border-none shadow-2xl rounded-[3rem] bg-white flex flex-col items-center justify-center text-center gap-8 min-h-[400px]">
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-100">
                <QrCode className="h-48 w-48 text-slate-300" />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Acceso Directo</p>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Escanea para Unirte</h3>
              </div>
            </Card>

            <Card className="p-10 border-none shadow-2xl rounded-[3rem] bg-slate-50 flex flex-col gap-6">
               <div className="flex justify-between items-center px-2">
                  <h4 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Alumnos en Sala
                  </h4>
                  <Badge className="bg-primary/10 text-primary font-black">{mockRoom.participants.length}</Badge>
               </div>
               <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[350px] pr-2">
                  {mockRoom.participants.map((p, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 animate-in slide-in-from-bottom-2">
                      <div className="h-8 w-8 rounded-full bg-primary/5 text-primary font-black text-xs flex items-center justify-center">{p.name[0]}</div>
                      <span className="font-bold text-slate-700 text-sm truncate uppercase tracking-tight">{p.name}</span>
                    </div>
                  ))}
               </div>
               <Button className="mt-auto h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs gap-3 shadow-xl shadow-emerald-200">
                  <Play className="h-5 w-5" /> Iniciar Primera Pregunta
               </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
