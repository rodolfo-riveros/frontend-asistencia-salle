"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Play, Fingerprint, ShieldCheck, Zap, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useMutation } from "convex/react"
import { api as convexApi } from "@convex/_generated/api"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [pin, setPin] = React.useState(searchParams.get('pin') || "")
  const [dni, setDni] = React.useState("")
  const [studentData, setStudentData] = React.useState<any | null>(null)
  const [isValidating, setIsValidating] = React.useState(false)
  const [isJoining, setIsJoining] = React.useState(false)
  
  const [avatarSeed, setAvatarSeed] = React.useState("Salle")

  const joinRoom = useMutation(convexApi.rooms.joinRoom)

  const fetchStudentData = async (val: string) => {
    const cleanDni = val.trim();
    if (cleanDni.length === 8) {
      setIsValidating(true)
      try {
        const student = await api.get<any>(`/alumnos/publico/${cleanDni}`)
        
        if (student && student.id && student.id !== "undefined") {
          setStudentData(student)
          // El seed del avatar ahora es consistente con el monitor del docente
          setAvatarSeed(student.nombre.split(',')[0])
          toast({ title: "Identidad Verificada", description: `Bienvenido, aspirante ${student.nombre}` })
        } else {
          setStudentData(null)
          toast({ variant: "destructive", title: "DNI no encontrado", description: "No figuras en el padrón oficial de La Salle." })
        }
      } catch (e: any) {
        setStudentData(null)
        toast({ variant: "destructive", title: "Error de Conexión", description: "Verifica tu DNI o el PIN ingresado." })
      } finally {
        setIsValidating(false)
      }
    } else {
      setStudentData(null)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPin = pin.trim().toUpperCase();
    
    if (!cleanPin || !dni || !studentData || !studentData.id || studentData.id === "undefined") {
      toast({ variant: "destructive", title: "Error de Identidad", description: "Vuelva a ingresar su DNI." });
      return;
    }
    
    setIsJoining(true)
    try {
      // FIX: usar alumno_id para consistencia con el backend
      const participantId = await joinRoom({ 
        roomCode: cleanPin, 
        name: studentData.nombre,
        alumno_id: studentData.id,
        programa: studentData.programa_nombre,
        semestre: studentData.semestre
      })
      
      localStorage.setItem(`p_${cleanPin}`, participantId)
      router.push(`/student/quiz/${cleanPin}`)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Arena no disponible", description: "La sala no existe o el juego ya finalizó." })
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8 z-10 my-auto px-4 font-body">
      <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-white border-4 border-primary/10 rounded-[2.5rem] shadow-2xl mb-2 group">
           <Zap className="h-12 w-12 text-primary fill-primary group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-1">
          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Rank-UP</h1>
          <p className="text-primary font-bold uppercase text-[10px] tracking-[0.4em] flex items-center justify-center gap-2">
            <Sparkles className="h-3 w-3" /> Salle Arena Live
          </p>
        </div>
      </div>

      <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-xl rounded-[3rem] p-8 md:p-12 overflow-hidden relative border-t-8 border-primary">
        <form onSubmit={handleJoin} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Pin del Desafío</label>
            <Input 
              value={pin}
              onChange={e => setPin(e.target.value.toUpperCase())}
              placeholder="------" 
              className="h-16 text-center text-4xl font-black font-mono tracking-[0.6em] border-none bg-slate-50 shadow-inner rounded-3xl focus-visible:ring-4 focus-visible:ring-primary/10"
              maxLength={6}
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Tu DNI Salle</label>
            <div className="relative group">
              <Fingerprint className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 h-6 w-6 group-focus-within:text-primary transition-colors" />
              <Input 
                value={dni}
                onChange={e => { setDni(e.target.value); fetchStudentData(e.target.value); }}
                placeholder="Ingresa 8 dígitos" 
                className="h-16 pl-16 font-black border-none bg-slate-50 shadow-inner rounded-3xl text-xl focus-visible:ring-4 focus-visible:ring-primary/10"
                maxLength={8}
                pattern="[0-9]{8}"
                required
              />
              {isValidating && <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 animate-spin text-primary" />}
            </div>
          </div>

          {studentData && (
            <div className="flex items-center gap-4 p-5 bg-emerald-50 rounded-3xl border-2 border-emerald-500/20 animate-in zoom-in-95 shadow-sm">
              <Avatar className="h-16 w-16 border-4 border-white shadow-xl scale-110 shrink-0">
                 <AvatarImage src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarSeed)}`} />
                 <AvatarFallback className="bg-emerald-600 text-white font-black text-xs">{getInitials(studentData.nombre)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 ml-2">
                 <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Identidad Confirmada</span>
                 <span className="text-sm font-black text-slate-800 uppercase truncate leading-none mt-1">{studentData.nombre}</span>
                 <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 truncate">{studentData.programa_nombre}</span>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isJoining || !studentData}
            className="w-full h-16 bg-primary hover:bg-primary/95 text-white rounded-3xl font-black uppercase text-xs tracking-wider shadow-xl shadow-primary/30 gap-4 transition-all active:scale-95 disabled:opacity-50"
          >
            {isJoining ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Play className="h-5 w-5 fill-current" />
                <span>¡Comenzar Ascenso!</span>
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default function StudentJoinPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-between p-6 relative overflow-hidden font-body">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary rounded-full blur-[120px] opacity-10 pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent rounded-full blur-[120px] opacity-5 pointer-events-none" />
      <React.Suspense fallback={<div className="my-auto flex flex-col items-center gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando Arena...</p></div>}>
        <JoinForm />
      </React.Suspense>
      <footer className="w-full text-center space-y-2 pb-8 pt-10 px-6 z-10">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary opacity-30" />
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            IES LA SALLE URUBAMBA
          </p>
        </div>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">© {new Date().getFullYear()} | <span className="text-primary/50 italic">Rodolfo Riveros</span></p>
      </footer>
    </div>
  )
}
