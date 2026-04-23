
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogIn, GraduationCap, Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useMutation } from "convex/react"
import { api as convexApi } from "@/../convex/_generated/api"
import { toast } from "@/hooks/use-toast"

export default function StudentJoinPage() {
  const router = useRouter()
  const [pin, setPin] = React.useState("")
  const [name, setName] = React.useState("")
  const [isJoining, setIsJoining] = React.useState(false)

  const joinRoom = useMutation(convexApi.rooms.joinRoom)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin || !name) return
    setIsJoining(true)
    try {
      const participantId = await joinRoom({ roomCode: pin, name })
      localStorage.setItem(`p_${pin}`, participantId)
      router.push(`/student/quiz/${pin}`)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "No se pudo unir a la sala." })
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary rounded-full blur-3xl opacity-20" />
      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-white/5 border border-white/10 rounded-[2rem] shadow-2xl mb-4">
             <GraduationCap className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">Quizz Live</h1>
          <p className="text-blue-200/50 font-bold uppercase text-[10px] tracking-[0.3em]">IES LA SALLE URUBAMBA</p>
        </div>

        <Card className="border-none shadow-2xl bg-white rounded-[3rem] p-10 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">PIN del Juego</label>
              <Input 
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="000000" 
                className="h-16 text-center text-3xl font-black font-mono tracking-[0.5em] border-none bg-slate-50 shadow-inner rounded-2xl"
                maxLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Tu Nombre</label>
              <Input 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Juan Pérez" 
                className="h-14 font-bold border-none bg-slate-50 shadow-inner rounded-2xl px-6"
                required
              />
            </div>
            <Button 
              type="submit" 
              disabled={isJoining}
              className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-3"
            >
              {isJoining ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />} Unirme al Desafío
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
