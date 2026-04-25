
"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { 
  ArrowLeft, Gamepad2, Sparkles, 
  Loader2, Radio, Users, Maximize2, Play, Trophy, 
  ShieldCheck, UserX, Crown, Zap, Clock, BookOpen, 
  AlertTriangle, Target, Percent, Award, ChevronRight,
  Medal, ListChecks, CheckCircle2, XCircle, LogOut, Download, Copy, Link as LinkIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { useMutation, useQuery } from "convex/react"
import { api as convexApi } from "@convex/_generated/api"
import { cn, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import confetti from "canvas-confetti"

export default function InstructorQuizPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loadingConfig, setLoadingConfig] = React.useState(true)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [isClosing, setIsClosing] = React.useState(false)
  const [config, setConfig] = React.useState<any>(null)
  const [roomCode, setRoomCode] = React.useState<string | null>(null)
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [showAcademicSummary, setShowAcademicSummary] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [ceremonyPhase, setCeremonyPhase] = React.useState<'idle' | 'announcement' | 'podium'>('idle')

  const unidadIdRef = React.useRef<string | null>(null)
  const periodoIdRef = React.useRef<string | null>(null)

  const createRoom = useMutation(convexApi.rooms.createRoom)
  const updateStatus = useMutation(convexApi.rooms.updateStatus)
  const room = useQuery(convexApi.rooms.getRoom, roomCode ? { roomCode } : "skip")

  React.useEffect(() => {
    const uid = searchParams.get('unidad_id') ?? searchParams.get('unidadId')
    const pid = searchParams.get('periodo_id')
    if (uid) unidadIdRef.current = uid
    if (pid) periodoIdRef.current = pid
  }, [])

  const fetchSession = React.useCallback(async () => {
    const evalId = params.id as string;
    if (!evalId || evalId === "undefined") return;
    
    setLoadingConfig(true)
    try {
      const quizEval = await api.get<any>(`/evaluaciones/${evalId}`)
      if (quizEval) {
        const enrichedConfig = { 
          ...quizEval,
          unidad_id: unidadIdRef.current || quizEval.unidad_id,
          periodo_id: periodoIdRef.current || quizEval.periodo_id
        };
        setConfig(enrichedConfig)
        
        try {
          const activeSession = await api.get<any>(`/gamificacion/sesion/${quizEval.id}/`)
          if (activeSession && activeSession.room_code) {
            setRoomCode(activeSession.room_code)
            const sid = activeSession.id || activeSession.sesion_id || activeSession.sesion?.id;
            if (sid && sid !== "undefined") {
              setSessionId(sid);
            }
          }
        } catch (e) { /* Sin sesión activa */ }
      }
    } catch (e: any) {
      console.error("Error cargando configuración:", e)
    } finally {
      setLoadingConfig(false)
    }
  }, [params.id])

  React.useEffect(() => {
    setMounted(true)
    fetchSession()
  }, [fetchSession])

  // Lógica de Ceremonia
  React.useEffect(() => {
    if (room?.status === 'finished' && isFullscreen && ceremonyPhase === 'idle') {
      setCeremonyPhase('announcement')
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFFFFF', '#6D28D9']
      })
      setTimeout(() => {
        setCeremonyPhase('podium')
      }, 4000)
    }
  }, [room?.status, isFullscreen, ceremonyPhase])

  const handleLaunchRoom = async () => {
    const questions = config?.configuracion_json?.questions;
    if (!config || !questions?.length) {
      return toast({ variant: "destructive", title: "Sin preguntas", description: "Genera el banco de preguntas en el registro auxiliar primero." })
    }

    const currentUnidadId = unidadIdRef.current || config.unidad_id
    if (!currentUnidadId || currentUnidadId === "SALLE" || currentUnidadId.length < 36) {
      return toast({ variant: "destructive", title: "Sin ID de Unidad", description: "Vuelve al registro y entra de nuevo para fijar el ID real." })
    }
    
    setIsSyncing(true)
    try {
      const session = await api.post<any>('/gamificacion/sesion/', {
        evaluacion_id: config.id,
        configuracion_json: config.configuracion_json
      })

      const finalSessionId = session?.id || session?.sesion_id || session?.sesion?.id;
      if (!session?.room_code || !finalSessionId) throw new Error("No se pudo generar el PIN o ID de sesión")

      await createRoom({
        roomCode: session.room_code,
        questions: questions,
        configId: config.id,
        unidadId: currentUnidadId
      })

      setRoomCode(session.room_code)
      setSessionId(finalSessionId)
      setIsFullscreen(true)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fallo al abrir sala", description: e.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleProjectArena = async () => {
    if (!roomCode || !config) return;
    if (!room) {
      setIsSyncing(true)
      try {
        await createRoom({
          roomCode: roomCode,
          questions: config?.configuracion_json?.questions || [],
          configId: config.id,
          unidadId: unidadIdRef.current || config.unidad_id || "SALLE"
        })
      } catch (e: any) {
        toast({ variant: "destructive", title: "Error de Sincronización", description: e.message })
        return
      } finally {
        setIsSyncing(false)
      }
    }
    setIsFullscreen(true)
  }

  const handleCopyLink = () => {
    if (!roomCode) return
    const link = `${window.location.origin}/student/quiz/join?pin=${roomCode}`
    navigator.clipboard.writeText(link)
    toast({ title: "Enlace Copiado", description: "Envía este link a los alumnos que no pueden escanear." })
  }

  const handleStartGame = async () => {
    if (!roomCode) return
    await updateStatus({ roomCode, status: 'active' })
    toast({ title: "¡Arena Iniciada!" })
  }

  const handleFinishGame = async () => {
    if (!roomCode) return
    try {
      await updateStatus({ roomCode, status: 'finished' })
      toast({ title: "Desafío Finalizado" })
    } catch (e) {
      console.error("Error finalizando juego:", e)
    }
  }

  const handleShowSummary = () => {
    setIsFullscreen(false)
    setShowAcademicSummary(true)
  }

  const handleCloseAndPersist = async () => {
    const finalEvalId = config?.id || params.id as string;
    const finalUnidadId = unidadIdRef.current || config?.unidad_id;
    const finalPeriodoId = periodoIdRef.current || config?.periodo_id || searchParams.get('periodo_id') || 'ACTUAL';

    if (!finalEvalId || finalEvalId === "undefined" || finalEvalId.length < 36) {
      toast({ variant: "destructive", title: "Error de Evaluación", description: "ID de evaluación inválido." });
      return;
    }

    if (!finalUnidadId || finalUnidadId === "SALLE" || finalUnidadId.length < 36) {
      toast({ variant: "destructive", title: "ID de Unidad Perdido", description: "Vuelve al registro e ingresa de nuevo para fijar el UUID." });
      return;
    }

    if (!room?.participants?.length) {
      toast({ variant: "destructive", title: "Sin participantes", description: "No hay alumnos para calificar." });
      return;
    }
    
    setIsClosing(true)
    try {
      const totalQuestions = config?.configuracion_json?.questions?.length || 20;
      const maxScore = config?.puntaje_maximo || 20;

      const validParticipants = room.participants.filter((p: any) => {
        const aid = p.alumno_id || p.studentId;
        return aid && aid !== "undefined" && aid.length >= 36;
      });

      const gradePromises = validParticipants.map((p: any) => {
        const alumnoId = p.alumno_id || p.studentId;
        const correctAnswers = p.answers?.filter((a: any) => a.isCorrect).length || 0;
        const academicGrade = parseFloat(((correctAnswers / totalQuestions) * maxScore).toFixed(2));
        
        return api.post('/evaluaciones/calificar/', {
          evaluacion_id: finalEvalId,
          alumno_id: alumnoId,
          puntaje: academicGrade,
          observacion: `Rank-UP: ${correctAnswers}/${totalQuestions} correctas. (${p.score} pts)`,
          detalles_json: { 
            aciertos: correctAnswers, 
            total_preguntas: totalQuestions,
            ranking_pts: p.score, 
            avatar: p.avatar 
          }
        });
      });

      const results = await Promise.allSettled(gradePromises);
      const exitosas = results.filter(r => r.status === 'fulfilled').length;

      if (sessionId && sessionId.length >= 36) {
        await api.post(`/gamificacion/sesion/${sessionId}/finalizar/`, { notas: [] }).catch(() => {});
      }

      toast({ title: "Sincronización Exitosa", description: `${exitosas} notas registradas en el auxiliar.` });
      router.push(`/instructor/grades/${finalUnidadId}?periodo_id=${finalPeriodoId}`);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fallo Crítico", description: e.message });
    } finally {
      setIsClosing(false);
    }
  }

  const handleExportQuestions = () => {
    if (!config?.configuracion_json?.questions) return;
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("INSTITUTO DE EDUCACIÓN SUPERIOR LA SALLE - URUBAMBA", 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`BANCO DE PREGUNTAS TÉCNICAS: ${config.nombre.toUpperCase()}`, 14, 30);
    
    const indicadorCodigo = config.indicador_codigo || "LOGRO NO DEFINIDO";
    doc.text(`CÓDIGO INDICADOR: ${indicadorCodigo}`, 14, 38);

    const questions = config.configuracion_json.questions;
    const body = questions.map((q: any, idx: number) => [
      `${idx + 1}`,
      q.text,
      q.options.map((opt: string, oIdx: number) => `${String.fromCharCode(65 + oIdx)}) ${opt}${q.correctIndex === oIdx ? ' [RESPUESTA CORRECTA]' : ''}`).join('\n')
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['N°', 'ENUNCIADO DE LA PREGUNTA', 'ALTERNATIVAS']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 80 } }
    });

    doc.save(`BANCO_PREGUNTAS_${config.nombre.replace(/\s+/g, '_')}.pdf`);
    toast({ title: "PDF Generado", description: "Se ha descargado el banco de preguntas con respuestas." });
  }

  const sortedParticipants = React.useMemo(() => {
    if (!room?.participants) return []
    return [...room.participants].sort((a: any, b: any) => b.score - a.score)
  }, [room?.participants])

  if (!mounted || loadingConfig) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-black uppercase text-[10px] tracking-widest text-slate-400">Iniciando Rank-UP Arena...</p>
      </div>
    )
  }

  if (showAcademicSummary) {
    return (
      <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b-2 border-slate-100 pb-10">
          <div className="space-y-2">
            <Badge className="bg-emerald-100 text-emerald-700 border-none font-black uppercase text-[9px] px-3 tracking-widest">Desafío Completado</Badge>
            <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Resumen de Notas</h2>
            <p className="text-slate-400 font-medium italic">Sincronización masiva con el Registro Auxiliar</p>
          </div>
          <Button 
            onClick={handleCloseAndPersist} 
            disabled={isClosing}
            className="h-16 px-10 bg-primary text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-2xl gap-3 transition-all hover:scale-[1.02] active:scale-95"
          >
            {isClosing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ListChecks className="h-5 w-5" />}
            CERRAR JUEGO Y PASAR NOTAS
          </Button>
        </div>

        <Card className="p-0 border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="pl-10 font-black text-[10px] uppercase text-slate-400 tracking-widest">Aspirante</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Programa Profesional</TableHead>
                <TableHead className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest">Ranking pts</TableHead>
                <TableHead className="text-center font-black text-[10px] uppercase text-slate-400 tracking-widest">Desempeño</TableHead>
                <TableHead className="text-right pr-10 font-black text-[10px] uppercase text-primary tracking-widest">Nota 0-20</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedParticipants.map((p: any) => {
                const totalQ = config?.configuracion_json?.questions?.length || 20;
                const corrects = p.answers?.filter((a: any) => a.isCorrect).length || 0;
                const grade = Math.round((corrects / totalQ) * (config?.puntaje_maximo || 20));
                
                return (
                  <TableRow key={p._id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="pl-10 py-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                              <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(p.avatar)}`} />
                              <AvatarFallback className="bg-slate-100 font-black text-[10px]">{getInitials(p.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-bold text-slate-900 uppercase text-sm truncate w-64">{p.name}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold text-slate-500 uppercase truncate w-48">{p.programa || 'General'}</span>
                    </TableCell>
                    <TableCell className="text-center">
                        <Badge variant="outline" className="border-primary/20 text-primary font-mono font-black">{p.score} PTS</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                        <span className="text-xs font-bold text-slate-500">{corrects} / {totalQ} correctas</span>
                    </TableCell>
                    <TableCell className="text-right pr-10">
                        <span className={cn("text-2xl font-black font-mono", grade < 13 ? 'text-red-600' : 'text-emerald-600')}>
                          {grade.toString().padStart(2, '0')}
                        </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    )
  }

  if (isFullscreen && roomCode) {
    if (room === undefined) return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
        <p className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Sincronizando Arena...</p>
      </div>
    )

    return (
      <div className="fixed inset-0 z-[100] bg-[#6D28D9] flex flex-col animate-in fade-in duration-500 overflow-hidden font-body">
        <div className="h-2 bg-yellow-400 w-full shadow-lg" />
        <div className="flex-grow flex flex-col lg:flex-row">
          <div className="w-full lg:w-[450px] bg-white/10 backdrop-blur-md p-10 flex flex-col justify-between border-r border-white/10 shadow-2xl z-20">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <Zap className="h-10 w-10 text-yellow-400 fill-yellow-400" />
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none">Arena Live</h2>
              </div>

              <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center space-y-4 border-b-8 border-yellow-400 relative overflow-hidden">
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">CÓDIGO PIN</p>
                 <h3 className="text-7xl font-black text-primary font-mono tracking-tighter leading-none">{roomCode}</h3>
                 <div className="p-4 bg-slate-50 rounded-[2.5rem] inline-block border-2 border-slate-100 shadow-inner">
                    {mounted && (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin)}/student/quiz/join?pin=${roomCode}`} 
                        className="w-40 h-44 mix-blend-multiply" 
                        alt="QR" 
                      />
                    )}
                 </div>
                 <div className="pt-2">
                    <Button onClick={handleCopyLink} variant="ghost" className="h-10 gap-2 text-primary font-black uppercase text-[9px] tracking-widest hover:bg-slate-100 rounded-xl">
                      <LinkIcon className="h-3.5 w-3.5" /> Copiar Enlace Directo
                    </Button>
                 </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center px-6">
                <div className="flex flex-col text-white">
                  <span className="text-[10px] font-black uppercase opacity-60 tracking-widest">ASPIRANTES</span>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-yellow-400" />
                    <span className="text-4xl font-black">{room?.participants?.length || 0}</span>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setIsFullscreen(false)} className="text-[10px] font-bold uppercase text-white/60 hover:text-white tracking-widest">Cerrar Monitor</Button>
              </div>
              
              {room.status === 'lobby' ? (
                <Button onClick={handleStartGame} disabled={!room?.participants?.length} className="w-full h-20 bg-yellow-400 text-primary rounded-[2rem] font-black text-xl shadow-2xl transition-all hover:scale-[1.02] border-b-4 border-yellow-600">
                  INICIAR ARENA
                </Button>
              ) : room.status === 'active' ? (
                <Button onClick={handleFinishGame} className="w-full h-20 bg-red-500 text-white rounded-[2rem] font-black text-xl shadow-2xl transition-all hover:scale-[1.02] border-b-4 border-red-700">
                  FINALIZAR DESAFÍO
                </Button>
              ) : (
                <Button onClick={handleShowSummary} className="w-full h-20 bg-white text-primary rounded-[2rem] font-black text-xl shadow-2xl border-b-4 border-slate-200 gap-3">
                  <CheckCircle2 className="h-6 w-6" /> VER RESULTADOS
                </Button>
              )}
            </div>
          </div>

          <div className="flex-grow p-10 bg-[#6D28D9] overflow-y-auto relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.05)_2px,transparent_0)] bg-[size:64px_64px]" />
            
            {ceremonyPhase === 'announcement' && (
              <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-50 duration-700 relative z-50">
                 <Trophy className="h-32 w-32 text-yellow-400 animate-bounce mb-8" />
                 <h2 className="text-7xl font-black text-white uppercase italic tracking-tighter text-center leading-none drop-shadow-[0_20px_20px_rgba(0,0,0,0.4)]">
                    ¡PODIO DE<br />CAMPEONES!
                 </h2>
                 <p className="mt-6 text-yellow-400 font-black text-xl uppercase tracking-[0.5em] animate-pulse">Revelando Ganadores...</p>
              </div>
            )}

            {ceremonyPhase === 'podium' && (
              <div className="h-full flex flex-col items-center justify-center animate-in fade-in duration-1000 relative z-10">
                <div className="flex items-end justify-center gap-6 md:gap-16 h-[400px] mb-10 relative z-40">
                  {/* Puesto 2 */}
                  {sortedParticipants[1] && (
                    <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-24 duration-700">
                      <div className="relative group">
                         <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                         <div className="w-28 h-28 md:w-32 md:h-32 bg-white/20 backdrop-blur-xl rounded-[2.5rem] p-2 border-4 border-slate-300 shadow-2xl relative z-10 flex items-center justify-center">
                            <Avatar className="w-full h-full rounded-[2rem]">
                              <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(sortedParticipants[1].avatar)}`} />
                              <AvatarFallback className="text-3xl font-black bg-slate-100">{getInitials(sortedParticipants[1].name)}</AvatarFallback>
                            </Avatar>
                         </div>
                         <div className="absolute -top-4 -right-4 h-10 w-10 bg-slate-400 rounded-2xl flex items-center justify-center font-black text-white text-lg border-4 border-[#6D28D9] shadow-xl z-20">2</div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="font-black text-white text-base uppercase truncate w-36">{sortedParticipants[1].name.split(',')[0]}</p>
                        <span className="text-yellow-400 font-black text-lg">{sortedParticipants[1].score}</span>
                      </div>
                      <div className="w-28 md:w-32 h-24 bg-white/10 backdrop-blur-md rounded-t-[2.5rem] border-t-8 border-slate-300/50 shadow-2xl" />
                    </div>
                  )}

                  {/* Puesto 1 */}
                  {sortedParticipants[0] && (
                    <div className="flex flex-col items-center gap-8 animate-in slide-in-from-bottom-40 duration-1000 relative z-50">
                      <Crown className="h-16 w-16 text-yellow-400 animate-bounce filter drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                      <div className="relative group">
                         <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-30 group-hover:opacity-50 transition-opacity animate-pulse" />
                         <div className="w-36 h-40 md:w-48 md:h-48 bg-white/30 backdrop-blur-2xl rounded-[3.5rem] p-3 border-[10px] border-yellow-400 shadow-2xl relative z-10 flex items-center justify-center">
                            <Avatar className="w-full h-full rounded-[2.5rem]">
                              <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(sortedParticipants[0].avatar)}`} />
                              <AvatarFallback className="text-5xl font-black bg-yellow-50">{getInitials(sortedParticipants[0].name)}</AvatarFallback>
                            </Avatar>
                         </div>
                         <div className="absolute -top-6 -right-6 h-14 w-14 bg-yellow-400 rounded-3xl flex items-center justify-center font-black text-primary text-2xl border-8 border-[#6D28D9] shadow-2xl z-20">1</div>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="font-black text-white text-2xl uppercase tracking-tighter drop-shadow-lg">{sortedParticipants[0].name.split(',')[0]}</p>
                        <div className="bg-yellow-400 px-6 py-1.5 rounded-full shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                          <span className="text-primary font-black text-2xl">{sortedParticipants[0].score}</span>
                        </div>
                      </div>
                      <div className="w-36 md:w-48 h-40 bg-white/20 backdrop-blur-lg rounded-t-[4rem] border-t-[14px] border-yellow-400 shadow-2xl" />
                    </div>
                  )}

                  {/* Puesto 3 */}
                  {sortedParticipants[2] && (
                    <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-16 duration-1000">
                      <div className="relative group">
                         <div className="absolute inset-0 bg-amber-700 blur-2xl opacity-10 group-hover:opacity-30 transition-opacity" />
                         <div className="w-24 h-24 md:w-28 md:h-28 bg-white/20 backdrop-blur-xl rounded-[2rem] p-2 border-4 border-amber-600/50 shadow-2xl relative z-10 flex items-center justify-center">
                            <Avatar className="w-full h-full rounded-[1.5rem]">
                              <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(sortedParticipants[2].avatar)}`} />
                              <AvatarFallback className="text-2xl font-black bg-amber-50">{getInitials(sortedParticipants[2].name)}</AvatarFallback>
                            </Avatar>
                         </div>
                         <div className="absolute -top-3 -right-3 h-8 w-8 bg-amber-700 rounded-2xl flex items-center justify-center font-black text-white text-base border-4 border-[#6D28D9] shadow-xl z-20">3</div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="font-black text-white text-sm uppercase truncate w-32">{sortedParticipants[2].name.split(',')[0]}</p>
                        <span className="text-yellow-400 font-black text-base">{sortedParticipants[2].score}</span>
                      </div>
                      <div className="w-24 md:w-28 h-20 bg-white/10 backdrop-blur-md rounded-t-[2.5rem] border-t-8 border-amber-700/40 shadow-2xl" />
                    </div>
                  )}
                </div>

                {sortedParticipants.length > 3 && (
                  <div className="w-full max-w-4xl space-y-2 animate-in fade-in duration-1000 pb-20 relative z-10">
                    <div className="flex items-center gap-4 px-10 mb-2">
                       <Medal className="h-4 w-4 text-yellow-400" />
                       <span className="text-white font-black uppercase text-[10px] tracking-[0.3em] italic">Honor Salle</span>
                       <div className="flex-1 h-px bg-white/10" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sortedParticipants.slice(3, 11).map((p: any, idx: number) => (
                        <div key={p._id} className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/10 flex items-center gap-4 group hover:bg-white/10 transition-all">
                          <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center font-black text-white/50 text-sm">{idx + 4}</div>
                          <Avatar className="h-9 w-9 border-2 border-white/20">
                             <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(p.avatar)}`} />
                             <AvatarFallback className="bg-primary text-white font-bold">{getInitials(p.name)}</AvatarFallback>
                          </Avatar>
                          <p className="flex-1 font-black text-white uppercase text-xs truncate">{p.name}</p>
                          <div className="px-3 py-1 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                             <span className="font-black text-yellow-400 text-sm">{p.score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {ceremonyPhase === 'idle' && (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-6 relative z-10">
                {room?.participants?.map((p: any) => (
                  <Card key={p._id} className={cn(
                    "flex flex-col items-center gap-4 p-6 rounded-[2.5rem] border-4 transition-all group relative bg-white shadow-xl",
                    p.isCheating ? "border-red-500 animate-pulse bg-red-50" : "border-transparent hover:border-yellow-400/30"
                  )}>
                    {p.isCheating && (
                      <div className="absolute -top-3 -right-3 flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-xl z-20 shadow-2xl border-4 border-white">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">FRAUDE</span>
                      </div>
                    )}
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-2 border-white shadow-lg group-hover:scale-110 transition-transform shrink-0 relative z-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(p.avatar)}`} />
                        <AvatarFallback className={cn("text-xl font-black uppercase", p.isCheating ? "bg-red-200 text-red-800" : "bg-primary/10 text-primary")}>
                          {getInitials(p.name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="text-center space-y-1 w-full overflow-hidden relative z-10">
                      <p className="text-[11px] font-black text-slate-900 truncate w-full uppercase italic tracking-tighter leading-none">{p.name.split(',')[0]}</p>
                      <div className="bg-primary/5 rounded-xl py-1.5 px-4 inline-block border border-primary/5">
                        <p className="text-lg font-black text-primary leading-none font-mono">{p.score}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-20 font-body">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b-2 border-slate-100 pb-10">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} className="h-10 text-primary font-black px-0 hover:bg-transparent uppercase tracking-[0.2em] text-[10px] gap-3">
              <ArrowLeft className="h-4 w-4" /> VOLVER AL REGISTRO
            </Button>
            
            <div className="h-4 w-px bg-slate-200" />
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleExportQuestions} 
                    className="h-10 w-10 border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm"
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-red-600 text-white border-none font-black text-[10px] uppercase tracking-widest">
                  Exportar Banco de Preguntas (PDF)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-6">
            <div className="p-6 bg-primary rounded-[2rem] text-white shadow-2xl shadow-primary/30">
              <Zap className="h-10 w-10 fill-current" />
            </div>
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Rank-UP Arena</h2>
              <p className="text-slate-400 font-bold italic text-base mt-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> Desafío de Gamificación Técnica Salle
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-4">
          {!roomCode ? (
            <Button onClick={handleLaunchRoom} disabled={isSyncing} className="h-20 px-14 bg-primary text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl gap-4 transition-all active:scale-95 disabled:grayscale">
              {isSyncing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Radio className="h-6 w-6 animate-pulse" />} LANZAR DESAFÍO
            </Button>
          ) : (
            <div className="flex items-center gap-6 bg-white border-2 border-slate-100 p-6 rounded-[2.5rem] shadow-2xl">
              <div className="flex flex-col px-8 border-r-2 border-slate-100">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">PIN ACTIVO</span>
                <span className="text-5xl font-black font-mono text-primary tracking-tighter">{roomCode}</span>
              </div>
              <Button onClick={handleProjectArena} disabled={isSyncing} className="bg-primary text-white h-20 px-12 rounded-[2rem] font-black uppercase text-sm tracking-widest gap-4 shadow-xl hover:scale-105 active:scale-95 transition-all">
                {isSyncing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Maximize2 className="h-6 w-6" />} PROYECTAR ARENA
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <Card className="p-12 border-none shadow-2xl bg-white rounded-[4rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-primary via-blue-400 to-accent" />
            <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800 mb-10 flex items-center gap-4">
              <BookOpen className="h-7 w-7 text-primary" /> Banco de Preguntas Generadas
            </h3>
            <div className="space-y-10">
              {(config?.configuracion_json?.questions || []).map((q: any, idx: number) => (
                <div key={idx} className="p-10 bg-slate-50/50 rounded-[3.5rem] border-2 border-slate-100 space-y-8 group hover:bg-white hover:border-primary/10 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3">
                       <Badge className="bg-primary text-white font-black text-[10px] px-6 py-1 rounded-full uppercase tracking-[0.3em]">ITEM {idx + 1}</Badge>
                       <p className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-tight max-w-2xl">{q.text}</p>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-sm shrink-0 flex flex-col items-center">
                      <Clock className="h-5 w-5 text-primary mb-1" />
                      <span className="font-black text-xl text-slate-900">{q.timeLimit}s</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((opt: string, oIdx: number) => (
                      <div key={oIdx} className={cn(
                        "p-5 rounded-2xl border-2 text-[11px] font-black uppercase flex items-center gap-4 shadow-sm",
                        q.correctIndex === oIdx ? "bg-emerald-50 border-emerald-500/30 text-emerald-700" : "bg-white border-slate-100 text-slate-400"
                      )}>
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border-2 font-black text-[10px]", q.correctIndex === oIdx ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-100 text-slate-200")}>
                          {String.fromCharCode(65 + oIdx)}
                        </div>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        
        <div className="space-y-8">
          <Card className="p-10 border-none shadow-2xl bg-white rounded-[3.5rem] sticky top-28 overflow-hidden border-2 border-slate-50">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
            <h4 className="text-xl font-black uppercase tracking-widest mb-10 flex items-center gap-4 text-slate-900">
              <ShieldCheck className="h-7 w-7 text-primary" /> Datos de la Actividad
            </h4>
            
            {config && (
              <div className="space-y-10">
                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 space-y-5">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Actividad Evaluativa</span>
                      <p className="text-lg font-black text-slate-900 uppercase leading-tight italic">{config.nombre}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary"><Percent className="h-4 w-4" /></div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase">Peso</span>
                          <span className="text-sm font-black text-primary">{config.peso_instrumento}%</span>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-accent/10 rounded-xl text-accent"><Award className="h-4 w-4" /></div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase">Máximo</span>
                          <span className="text-sm font-black text-accent">{config.puntaje_maximo} pts</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-primary/5 rounded-3xl border-2 border-primary/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-primary text-white font-black text-[9px] px-3 py-0.5 rounded-lg tracking-widest uppercase">{config.indicador_codigo || config.indicador?.codigo || "LOGRO"}</Badge>
                      <Target className="h-4 w-4 text-primary/30" />
                    </div>
                    <p className="text-[11px] font-bold text-primary uppercase leading-relaxed">{config.indicador_desc || config.indicador?.descripcion}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Criterios Técnicos</span>
                    <Badge variant="outline" className="text-[9px] font-black border-slate-200 text-slate-400">
                      {(config.configuracion_json?.criteria || []).length} ITEMS
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {(config.configuracion_json?.criteria || []).map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-slate-50 group hover:border-primary/20 transition-all shadow-sm">
                         <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xs shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">{i + 1}</div>
                         <p className="text-[10px] font-black text-slate-600 uppercase tracking-tight leading-relaxed line-clamp-2">{c.description || c.category}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 text-center border-t border-slate-100">
                   <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">
                     PLATAFORMA ACADÉMICA SALLE
                   </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
