
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Gamepad2, Sparkles, LogIn, Loader2, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

export default function StudentJoinPage() {
  const router = useRouter()
  const [pin, setPin] = React.useState("")
  const [name, setName] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length < 4) return toast({ variant: "destructive", title: "PIN Inválido", description: "Ingresa el código de 4 dígitos." })
    if (!name) return toast({ variant: "destructive", title: "Nombre Requerido", description: "¿Cómo te identificaremos?" })
    
    setIsLoading(true)
    // Simulación de unión en Firestore
    await new Promise(r => setTimeout(r, 1500))
    toast({ title: "¡Unido con éxito!", description: "Espera a que el docente inicie el Quizz." })
    router.push(`/student/quiz/room-123`)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary rounded-full blur-3xl opacity-20" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent rounded-full blur-3xl opacity-20" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-white/5 border border-white/10 rounded-[2rem] shadow-2xl mb-4">
             <GraduationCap className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">Quizz Live</h1>
          <p className="text-blue-200/50 font-bold uppercase text-[10px] tracking-[0.3em]">IES La Salle Urubamba</p>
        </div>

        <Card className="border-none shadow-2xl bg-white rounded-[3rem] p-8 overflow-hidden">
          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Pin de Juego</label>
              <Input 
                value={pin}
                onChange={e => setPin(e.target.value.toUpperCase())}
                placeholder="0000"
                maxLength={4}
                className="h-20 text-center text-5xl font-black font-mono border-none bg-slate-100 rounded-2xl shadow-inner focus-visible:ring-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tu Nombre Completo</label>
              <Input 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Juan Perez"
                className="h-14 border-none bg-slate-100 rounded-xl shadow-inner font-bold text-lg px-6"
                required
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-16 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-3 mt-4"
            >
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <LogIn className="h-6 w-6" />}
              Entrar a la Sala
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Espera las instrucciones de tu docente</p>
        </div>
      </div>
    </div>
  )
}
