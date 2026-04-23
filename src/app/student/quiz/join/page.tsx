"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogIn, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export default function StudentJoinPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary rounded-full blur-3xl opacity-20" />
      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-white/5 border border-white/10 rounded-[2rem] shadow-2xl mb-4">
             <GraduationCap className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Quizz Live</h1>
          <p className="text-blue-200/50 font-bold uppercase text-[10px] tracking-[0.2em]">Sincronizando con FastAPI...</p>
        </div>
        <Card className="border-none shadow-2xl bg-white rounded-[3rem] p-8 overflow-hidden">
          <div className="text-center py-10 space-y-4">
            <p className="text-slate-400 font-bold uppercase text-xs">Módulo en mantenimiento</p>
            <p className="text-slate-900 font-black">Pronto podrás unirte a los desafíos.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
