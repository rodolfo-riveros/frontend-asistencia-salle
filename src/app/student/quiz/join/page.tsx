
"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { GraduationCap, Loader2, Play, Fingerprint, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useMutation } from "convex/react"
import { api as convexApi } from "@/../convex/_generated/api"
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
        const student = await api.get<any>(`/alumnos/by-dni/${val}`)
        if (student && student.nombre) {
          setStudentName(student.nombre)
        } else {
          toast({ variant: "destructive", title: "DNI no registrado", description: "No perteneces al padrón institucional." })
          setStudentName(null)
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
      toast({ variant: "destructive", title: "Error", description: e.message || "Fallo al unirse." })
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary rounded-full blur-3xl opacity-10" />
      
      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-white border-2 border-primary/10 rounded-[2.5rem] shadow-xl mb-4">
             <GraduationCap className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Quizz Live</h1>
          <p className="text-primary font-bold uppercase text-[10px] tracking-[0.3em]">IES LA SALLE URUBAMBA</p>
        </div>

        <Card className="border-none shadow-2xl bg-white rounded-[3rem] p-10 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
          
          <form onSubmit={handleJoin} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">PIN del Juego</label>
              <Input 
                value={pin}
                onChange={e => setPin(e.target.value.toUpperCase())}
                placeholder="000000" 
                className="h-16 text-center text-3xl font-black font-mono tracking-[0.5em] border-none bg-slate-50 shadow-inner rounded-2xl"
                maxLength={6}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Tu DNI</label>
              <div className="relative">
                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 h-5 w-5" />
                <Input 
                  value={dni}
                  onChange={e => { setDni(e.target.value); fetchStudentData(e.target.value); }}
                  placeholder="8 dígitos" 
                  className="h-14 pl-12 font-bold border-none bg-slate-50 shadow-inner rounded-2xl text-lg"
                  maxLength={8}
                  required
                />
                {isValidating && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
              </div>
            </div>

            {studentName && (
              <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 animate-in slide-in-from-top-2">
                <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                   <AvatarFallback className="bg-primary text-white font-black">{getInitials(studentName)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                   <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Estudiante Identificado</span>
                   <span className="text-xs font-black text-slate-800 uppercase leading-none mt-1">{studentName}</span>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isJoining || !studentName}
              className="w-full h-20 bg-primary hover:bg-primary/90 text-white rounded-3xl font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/30 gap-3 transition-all"
            >
              {isJoining ? <Loader2 className="h-6 w-6 animate-spin" /> : <Play className="h-6 w-6 fill-current" />} Unirme al Desafío
            </Button>
          </form>
        </Card>
        
        <p className="text-center text-[9px] font-black uppercase text-slate-400 tracking-widest">La Salle Urubamba • Educación con Valores</p>
      </div>
    </div>
  )
}
