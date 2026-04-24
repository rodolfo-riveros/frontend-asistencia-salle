
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
    const cleanDni = val.trim();
    if (cleanDni.length === 8) {
      setIsValidating(true)
      try {
        // Se utiliza el nuevo endpoint público habilitado en FastAPI para evitar errores de autorización en móviles
        const student = await api.get<any>(`/alumnos/publico/${cleanDni}`)
        
        if (student && student.nombre) {
          setStudentName(student.nombre)
          toast({ title: "Identidad Verificada", description: `Bienvenido, ${student.nombre}` })
        } else {
          setStudentName(null)
          toast({ 
            variant: "destructive", 
            title: "DNI no encontrado", 
            description: "No figuras en el padrón oficial de La Salle." 
          })
        }
      } catch (e: any) {
        setStudentName(null)
        // Manejo elegante si el backend devuelve error (ej. 404 o problema de red)
        const isNotFound = e.message.includes('404') || e.message.includes('Not Found');
        toast({ 
          variant: "destructive", 
          title: isNotFound ? "DNI no encontrado" : "Error de Conexión", 
          description: isNotFound 
            ? "Verifica tu número de documento." 
            : "No se pudo conectar con el servidor institucional." 
        })
      } finally {
        setIsValidating(false)
      }
    } else {
      setStudentName(null)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPin = pin.trim().toUpperCase();
    if (!cleanPin || !dni || !studentName) return
    
    setIsJoining(true)
    try {
      const participantId = await joinRoom({ roomCode: cleanPin, name: studentName })
      localStorage.setItem(`p_${cleanPin}`, participantId)
      router.push(`/student/quiz/${cleanPin}`)
    } catch (e: any) {
      toast({ 
        variant: "destructive", 
        title: "Arena no disponible", 
        description: "La sala no existe o aún no ha sido proyectada por el docente." 
      })
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8 z-10 my-auto px-4 font-body">
      <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white border-4 border-primary/10 rounded-[2rem] shadow-2xl mb-2 group">
           <Zap className="h-10 w-10 text-primary fill-primary group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Rank-UP</h1>
          <p className="text-primary font-bold uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-2">
            <Sparkles className="h-3 w-3" /> Salle Arena Live
          </p>
        </div>
      </div>

      <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 overflow-hidden relative border-t-8 border-primary">
        <form onSubmit={handleJoin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Pin del Desafío</label>
            <Input 
              value={pin}
              onChange={e => setPin(e.target.value.toUpperCase())}
              placeholder="------" 
              className="h-14 text-center text-3xl font-black font-mono tracking-[0.5em] border-none bg-slate-50 shadow-inner rounded-2xl focus-visible:ring-4 focus-visible:ring-primary/10"
              maxLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Identificación Salle</label>
            <div className="relative group">
              <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 h-5 w-5 group-focus-within:text-primary" />
              <Input 
                value={dni}
                onChange={e => { setDni(e.target.value); fetchStudentData(e.target.value); }}
                placeholder="Ingresa tu DNI" 
                className="h-14 pl-14 font-bold border-none bg-slate-50 shadow-inner rounded-2xl text-lg focus-visible:ring-4 focus-visible:ring-primary/10"
                maxLength={8}
                pattern="[0-9]{8}"
                required
              />
              {isValidating && <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />}
            </div>
          </div>

          {studentName && (
            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border-2 border-primary/10 animate-in zoom-in-95 shadow-sm">
              <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                 <AvatarFallback className="bg-primary text-white font-black text-xs">{getInitials(studentName)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                 <span className="text-[8px] font-black uppercase text-primary tracking-widest">Héroe Salle Confirmado</span>
                 <span className="text-sm font-black text-slate-800 uppercase truncate leading-none mt-1">{studentName}</span>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isJoining || !studentName}
            className="w-full h-16 bg-primary hover:bg-primary/95 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-xl shadow-primary/20 gap-3 transition-all active:scale-95 disabled:opacity-50"
          >
            {isJoining ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Comenzar Ascenso</span>
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
      <React.Suspense fallback={<div className="my-auto flex flex-col items-center gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando Arena...</p></div>}>
        <JoinForm />
      </React.Suspense>
      <footer className="w-full text-center space-y-2 pb-8 pt-10 px-6 z-10">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3 w-3 text-primary opacity-40" />
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">IES LA SALLE URUBAMBA</p>
        </div>
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">© {new Date().getFullYear()} | <span className="text-primary italic">Rodolfo Riveros</span></p>
      </footer>
    </div>
  )
}
