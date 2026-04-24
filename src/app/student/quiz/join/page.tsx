
"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { GraduationCap, Loader2, Play, Fingerprint, ShieldCheck, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useMutation } from "convex/react"
import { api as convexApi } from "@convex/_generated/api"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

export default function StudentJoinPage() {
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
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-between p-6 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary rounded-full blur-[120px] opacity-5 pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent rounded-full blur-[120px] opacity-5 pointer-events-none" />
      
      <div className="w-full max-w-md space-y-8 z-10 my-auto">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white border-2 border-primary/5 rounded-[1.8rem] shadow-xl mb-2 transition-transform hover:scale-105 duration-500">
             <Zap className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none drop-shadow-sm">Rank-UP</h1>
            <p className="text-primary font-bold uppercase text-[10px] tracking-[0.25em]">Sallé Challenge Live</p>
          </div>
        </div>

        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white rounded-[2.5rem] p-8 md:p-10 overflow-hidden relative border-t-8 border-primary">
          <form onSubmit={handleJoin} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] ml-1">Pin de Juego</label>
              <Input 
                value={pin}
                onChange={e => setPin(e.target.value.toUpperCase())}
                placeholder="------" 
                className="h-16 text-center text-3xl font-black font-mono tracking-[0.4em] border-none bg-slate-50 shadow-inner rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/20"
                maxLength={6}
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] ml-1">Identificación</label>
              <div className="relative">
                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 h-5 w-5" />
                <Input 
                  value={dni}
                  onChange={e => { setDni(e.target.value); fetchStudentData(e.target.value); }}
                  placeholder="Número de DNI" 
                  className="h-14 pl-12 font-bold border-none bg-slate-50 shadow-inner rounded-2xl text-lg focus-visible:ring-2 focus-visible:ring-primary/20"
                  maxLength={8}
                  pattern="[0-9]{8}"
                  required
                />
                {isValidating && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />}
              </div>
            </div>

            {studentName && (
              <div className="flex items-center gap-4 p-5 bg-blue-50/50 rounded-2xl border border-primary/10 animate-in zoom-in-95 duration-300">
                <Avatar className="h-12 w-12 border-2 border-white shadow-md rounded-xl">
                   <AvatarFallback className="bg-primary text-white font-black text-sm">{getInitials(studentName)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                   <span className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Héroe Salle Listo</span>
                   <span className="text-sm font-black text-slate-800 uppercase leading-none mt-1 truncate">{studentName}</span>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isJoining || !studentName}
              className="w-full h-18 py-8 bg-primary hover:bg-primary/95 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/25 gap-3 transition-all active:scale-95 disabled:grayscale"
            >
              {isJoining ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />} ¡Comenzar el Ascenso!
            </Button>
          </form>
        </Card>
      </div>
      
      <footer className="w-full text-center space-y-2 pb-6 pt-10">
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
