
"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, Play, Users, Trophy, Gamepad2, Sparkles, QrCode, 
  Loader2, ChevronRight, Save, Zap, AlertCircle, CheckCircle2, CloudUpload
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QuizHeader } from "@/components/quiz/QuizHeader"
import { QuestionEditor } from "@/components/quiz/QuestionEditor"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { generateQuiz } from "@/ai/flows/generate-quiz-flow"
import { useFirestore } from "@/firebase"
import { doc, setDoc, onSnapshot, collection, updateDoc } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export default function InstructorQuizPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const firestore = useFirestore()
  const periodoId = searchParams.get('periodo_id') || "ACTUAL"

  const [view, setView] = React.useState<'setup' | 'game'>('setup')
  const [loadingConfig, setLoadingConfig] = React.useState(true)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isLaunching, setIsLaunching] = React.useState(false)
  const [isSyncing, setIsSyncing] = React.useState(false)
  
  const [config, setConfig] = React.useState<any>(null)
  const [questions, setQuestions] = React.useState<any[]>([])
  const [roomData, setRoomData] = React.useState<any>(null)
  const [participants, setParticipants] = React.useState<any[]>([])

  // 1. Cargar configuración de evaluación desde FastAPI
  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await api.get<any[]>(`/evaluaciones/config/${params.id}/${periodoId}`)
        // Buscamos la configuración de gamificación vinculada a esta unidad
        const quizConfig = data.find((c: any) => c.estrategia === 'quizz')
        if (quizConfig) {
          setConfig(quizConfig)
        }
      } catch (e) {
        console.error("Error al cargar config:", e)
      } finally {
        setLoadingConfig(false)
      }
    }
    fetchConfig()
  }, [params.id, periodoId])

  // 2. Generar preguntas con IA basadas en los criterios
  const handleAiGenerate = async () => {
    if (!config?.criterios?.length) {
      return toast({ variant: "destructive", title: "Sin Criterios", description: "Primero digitaliza un instrumento con criterios." })
    }
    setIsGenerating(true)
    try {
      const result = await generateQuiz({
        criteria: config.criterios.map((c: any, i: number) => ({ id: i.toString(), description: c.description })),
        subjectName: config.nombre
      })
      setQuestions(result.questions)
      toast({ title: "Quizz Generado", description: "Preguntas creadas con éxito basándose en tus criterios." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de IA", description: e.message })
    } finally {
      setIsGenerating(false)
    }
  }

  // 3. Lanzar sala en Firestore
  const handleLaunch = async () => {
    if (questions.length === 0) return toast({ variant: "destructive", title: "Quizz Vacío", description: "Genera o añade preguntas." })
    setIsLaunching(true)
    
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    const roomId = `room-${params.id}-${Date.now()}`
    
    const initialRoom = {
      id: roomId,
      pin,
      unitId: params.id,
      status: 'lobby',
      currentQuestionIndex: -1,
      questions,
      createdAt: new Date().toISOString()
    }

    const roomRef = doc(firestore, 'quizz_rooms', roomId)
    
    setDoc(roomRef, initialRoom)
      .then(() => {
        setView('game')
        setIsLaunching(false)
        onSnapshot(roomRef, (snapshot) => setRoomData(snapshot.data()))
        onSnapshot(collection(firestore, 'quizz_rooms', roomId, 'participants'), (snapshot) => {
          setParticipants(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
        })
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: roomRef.path,
          operation: 'create',
          requestResourceData: initialRoom
        })
        errorEmitter.emit('permission-error', permissionError)
        setIsLaunching(false)
      })
  }

  const handleStartGame = async () => {
    if (!roomData) return
    const roomRef = doc(firestore, 'quizz_rooms', roomData.id)
    updateDoc(roomRef, { status: 'active', currentQuestionIndex: 0 })
  }

  const handleNextQuestion = async () => {
    if (!roomData) return
    const nextIndex = roomData.currentQuestionIndex + 1
    const roomRef = doc(firestore, 'quizz_rooms', roomData.id)
    
    if (nextIndex >= questions.length) {
      updateDoc(roomRef, { status: 'finished' })
      toast({ title: "Quizz Finalizado", description: "Ya puedes sincronizar las notas con el servidor." })
    } else {
      updateDoc(roomRef, { currentQuestionIndex: nextIndex })
    }
  }

  // 4. Sincronizar notas con FastAPI
  const handleSyncGrades = async () => {
    if (participants.length === 0) return
    setIsSyncing(true)
    
    try {
      // Calcular nota vigesimal basada en el porcentaje de aciertos
      const maxPossibleScore = questions.length * 10 
      const gradesPayload = participants.map(p => ({
        alumno_id: p.studentId || p.id, // Suponiendo que el ID de participante es el ID de alumno
        nota: Math.round(((p.score || 0) / maxPossibleScore) * 20),
        feedback: `Gamificación: ${p.score} pts obtenidos en ${questions.length} preguntas.`
      }))

      const payload = {
        unidad_id: params.id,
        periodo_id: periodoId,
        config_id: config.id,
        notas: gradesPayload
      }

      await api.post('/evaluaciones/notas-gamificacion/', payload)
      
      toast({ 
        title: "¡Notas Sincronizadas!", 
        description: "El registro auxiliar ha sido actualizado correctamente." 
      })
      setView('setup')
    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: "Error de Sincronización", 
        description: "No se pudieron enviar las notas a FastAPI." 
      })
    } finally {
      setIsSyncing(false)
    }
  }

  if (loadingConfig) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-black uppercase text-xs tracking-widest text-slate-400">Cargando Estrategia...</p>
      </div>
    )
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
              <h2 className="text-4xl font-headline font-black tracking-tight text-slate-900 uppercase italic">Gamificación</h2>
              <p className="text-slate-500 font-medium italic">Evaluaciones Interactivas La Salle</p>
            </div>
          </div>
        </div>

        {view === 'setup' && (
          <div className="flex gap-3">
             <Button 
              onClick={handleAiGenerate} 
              disabled={isGenerating}
              variant="outline"
              className="h-16 px-8 border-2 border-accent text-accent hover:bg-accent hover:text-white rounded-2xl font-black uppercase text-xs tracking-widest gap-3"
            >
              {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              Auto-Generar con IA
            </Button>
            <Button 
              onClick={handleLaunch} 
              disabled={isLaunching || questions.length === 0}
              className="h-16 px-10 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-3"
            >
              {isLaunching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
              Lanzar Sala
            </Button>
          </div>
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
                <Zap className="text-yellow-400 h-5 w-5" /> Configuración Activa
              </h4>
              <div className="space-y-6">
                {!config ? (
                   <div className="p-6 bg-red-500/10 rounded-2xl border border-red-500/20 flex gap-3 text-red-200">
                     <AlertCircle className="h-5 w-5 shrink-0" />
                     <p className="text-[10px] font-bold uppercase leading-relaxed">No se detectó un instrumento digitalizado. Por favor, usa el asistente de evaluación primero.</p>
                   </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                       <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest">Actividad Vinculada</span>
                       <p className="text-sm font-black uppercase">{config.nombre}</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                       <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Criterios a Evaluar</span>
                       <div className="space-y-2">
                          {config.criterios.map((c: any, i: number) => (
                            <div key={i} className="flex gap-2 text-[10px] text-white/60 items-start">
                               <span className="font-black text-white/90 shrink-0">{i + 1}.</span>
                               <span className="line-clamp-2 italic">{c.description}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
          <QuizHeader roomCode={roomData?.pin || "----"} participantCount={participants.length} status={roomData?.status || 'lobby'} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {roomData?.status === 'lobby' ? (
              <Card className="p-10 border-none shadow-2xl rounded-[3rem] bg-white flex flex-col items-center justify-center text-center gap-8 min-h-[400px]">
                <div className="p-8 bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-100">
                  <QrCode className="h-48 w-48 text-slate-300" />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Acceso Directo</p>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Escanea para Unirte</h3>
                </div>
              </Card>
            ) : roomData?.status === 'active' ? (
              <Card className="p-10 border-none shadow-2xl rounded-[3rem] bg-white flex flex-col gap-8 min-h-[400px]">
                <div className="space-y-2">
                   <Badge className="bg-primary text-white font-black">PREGUNTA {roomData.currentQuestionIndex + 1} DE {questions.length}</Badge>
                   <h3 className="text-3xl font-black text-slate-900 leading-tight uppercase italic">{questions[roomData.currentQuestionIndex].text}</h3>
                </div>
                <div className="grid gap-3">
                   {questions[roomData.currentQuestionIndex].options.map((opt: string, i: number) => (
                     <div key={i} className={`p-5 rounded-2xl border-2 font-bold text-lg ${i === questions[roomData.currentQuestionIndex].correctIndex ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400'}`}>
                        {opt} {i === questions[roomData.currentQuestionIndex].correctIndex && "✓"}
                     </div>
                   ))}
                </div>
                <Button onClick={handleNextQuestion} className="h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest gap-2">
                  Siguiente Paso <ChevronRight className="h-5 w-5" />
                </Button>
              </Card>
            ) : (
              <Card className="p-10 border-none shadow-2xl rounded-[3rem] bg-emerald-600 text-white flex flex-col items-center justify-center text-center gap-6 min-h-[400px]">
                <div className="p-6 bg-white/20 rounded-full animate-bounce">
                  <Trophy className="h-20 w-20" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-4xl font-black uppercase italic">¡Quizz Terminado!</h3>
                  <p className="text-emerald-50/80 font-medium">Las respuestas se han procesado correctamente.</p>
                </div>
                
                <Button 
                  onClick={handleSyncGrades} 
                  disabled={isSyncing}
                  className="h-16 px-10 bg-white text-emerald-700 hover:bg-emerald-50 rounded-2xl font-black uppercase text-xs gap-3 shadow-xl"
                >
                  {isSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CloudUpload className="h-5 w-5" />}
                  Sincronizar con Registro
                </Button>
                
                <Button onClick={() => setView('setup')} variant="ghost" className="text-white/60 hover:text-white font-bold uppercase text-[10px]">Cancelar y Volver</Button>
              </Card>
            )}

            <Card className="p-10 border-none shadow-2xl rounded-[3rem] bg-slate-50 flex flex-col gap-6">
               <div className="flex justify-between items-center px-2">
                  <h4 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Alumnos en Sala
                  </h4>
                  <Badge className="bg-primary/10 text-primary font-black">{participants.length}</Badge>
               </div>
               <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[350px] pr-2">
                  {participants.map((p, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group animate-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/5 text-primary font-black text-xs flex items-center justify-center uppercase">{p.name[0]}</div>
                        <span className="font-bold text-slate-700 text-sm truncate uppercase tracking-tight">{p.name}</span>
                      </div>
                      <Badge className={p.score > 0 ? "bg-emerald-100 text-emerald-700 font-black" : "bg-slate-100 text-slate-400"}>{p.score || 0} pts</Badge>
                    </div>
                  ))}
               </div>
               {roomData?.status === 'lobby' && (
                 <Button onClick={handleStartGame} disabled={participants.length === 0} className="mt-auto h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs gap-3 shadow-xl shadow-emerald-200">
                    <Play className="h-5 w-5" /> Comenzar Desafío
                 </Button>
               )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
