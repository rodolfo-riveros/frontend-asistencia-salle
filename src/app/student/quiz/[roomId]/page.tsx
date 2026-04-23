"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function StudentGameRoomPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-white font-black uppercase text-xs tracking-widest opacity-50">Sincronizando con el servidor...</p>
      <Button onClick={() => router.push('/')} variant="ghost" className="text-white/40">Volver al inicio</Button>
    </div>
  )
}

import { Button } from "@/components/ui/button"
