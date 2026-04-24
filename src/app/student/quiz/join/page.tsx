
"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { GraduationCap, Loader2, Play, Fingerprint, ShieldCheck, Zap, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useMutation } from "convex/react"
import { api as convexApi } from "@convex/_generated/api"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [pin, setPin] = React.useState(searchParams.get('pin') || "")
  const [dni, setDni] = React.useState("")
  const [studentName, setStudentName] = React.useState<string | null>(null)
  const [isValidating, setIsValidating] = React.useState(false)
  const [isJoining, setIsJoining] = React.useState(false)

  const joinRoom = useMutation(convexApi.rooms.joinRoom)

  const fetchStudentData = async (val: string) => {
    if (val.length === 8) {
      setIsValidating(true)
      try {
        const students = await api.get<any[]>('/alumnos/').catch(() => [])
        const student = (students || []).find(s => String(s.dni) === val)
        
        if (student && student.nombre) {
          setStudentName(student.nombre)
        } else {
          setStudentName(null)
          if (students.length > 0) {
            toast({ variant: "destructive", title: "DNI no registrado", description: "Verifica tu número de documento." })
          }
        }
      } catch (e) {
        setStudentName(null)
      } finally {
        setIsValidating(false)
      }
    } else {
      setStudentName(null)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin || !dni || !studentName) return
    setIsJoining(true)
    try {
      const participantId = await joinRoom({ roomCode: pin, name: studentName })
      localStorage.setItem(`p_${pin}`, participantId)
      router.push(`/student/quiz/${pin}`)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sala no disponible", description: e.message || "Verifica que el PIN sea correcto." })
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8 z-10 my-auto">
      <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-white border-4 border-primary/10 rounded-[2.2rem] shadow-2xl mb-2 transition-transform hover:scale-110 duration-500 group">
           <Zap className="h-12 w-12 text-primary fill-primary group-hover:animate-pulse" />
        </div>
        <div className="space-y-1">
          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter italic leading-none drop-shadow-sm">Rank-UP</h1>
          <p className="text-primary font-bold uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-2">
            <Sparkles className="h-3 w-3" /> Salle Challenge Live
          </p>
        </div>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 overflow-hidden relative border-t-8 border-primary">
        <form onSubmit={handleJoin} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Pin del Desafío</label>
            <Input 
              value={pin}
              onChange={e => setPin(e.target.value.toUpperCase())}
              placeholder="------" 
              className="h-20 text-center text-4xl font-black font-mono tracking-[0.5em] border-none bg-slate-50 shadow-inner rounded-3xl focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
              maxLength={6}
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Identificación Salle</label>
            <div className="relative group">
              <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 h-6 w-6 group-focus-within:text-primary transition-colors" />
              <Input 
                value={dni}
                onChange={e => { setDni(e.target.value); fetchStudentData(e.target.value); }}
                placeholder="Número de DNI" 
                className="h-16 pl-14 font-bold border-none bg-slate-50 shadow-inner rounded-[1.8rem] text-xl focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
                maxLength={8}
                pattern="[0-9]{8}"
                required
              />
              {isValidating && <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 animate-spin text-primary" />}
            </div>
          </div>

          {studentName && (
            <div className="flex items-center gap-5 p-6 bg-primary/5 rounded-[2rem] border-2 border-primary/10 animate-in zoom-in-95 duration-500 shadow-sm">
              <Avatar className="h-14 w-14 border-4 border-white shadow-xl rounded-2xl">
                 <AvatarFallback className="bg-primary text-white font-black text-lg">{getInitials(studentName)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                 <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Héroe Salle Listo
                 </span>
                 <span className="text-base font-black text-slate-800 uppercase leading-none mt-1 truncate">{studentName}</span>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isJoining || !studentName}
            className="w-full h-20 py-8 bg-primary hover:bg-primary/95 text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-primary/30 gap-4 transition-all active:scale-95 disabled:grayscale disabled:opacity-50"
          >
            {isJoining ? <Loader2 className="h-6 w-6 animate-spin" /> : <Play className="h-6 w-6 fill-current" />} ¡Comenzar Ascenso!
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
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent rounded-full blur-[120px] opacity-10 pointer-events-none" />
      
      <React.Suspense fallback={<div className="my-auto text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /><p className="mt-4 font-black uppercase text-[10px] tracking-widest text-slate-400">Preparando Arena...</p></div>}>
        <JoinForm />
      </React.Suspense>
      
      <footer className="w-full text-center space-y-3 pb-8 pt-10 px-6 z-10">
        <div className="flex items-center justify-center gap-3">
          <ShieldCheck className="h-4 w-4 text-primary opacity-40" />
          <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.25em]">
            IES LA SALLE URUBAMBA
          </p>
        </div>
        <div className="h-px w-12 bg-slate-200 mx-auto" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Desarrollado por <span className="text-primary font-black italic">Rodolfo Riveros</span>
        </p>
      </footer>
    </div>
  )
}
