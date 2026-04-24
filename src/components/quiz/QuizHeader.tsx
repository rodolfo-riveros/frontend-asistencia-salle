
"use client"

import { Zap, Trophy, Users, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function QuizHeader({ roomCode, participantCount, status }: { roomCode: string, participantCount: number, status: string }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-400/10 rounded-xl">
            <Zap className="h-6 w-6 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Rank-UP</h2>
        </div>
        <p className="text-blue-200/50 text-[10px] font-black uppercase tracking-[0.2em]">Sallé Challenge Live</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex flex-col items-center">
          <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-1">Código Arena</span>
          <span className="text-3xl font-black text-white font-mono tracking-widest">{roomCode}</span>
        </div>
        
        <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex flex-col items-center">
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Aspirantes</span>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            <span className="text-2xl font-black text-white">{participantCount}</span>
          </div>
        </div>

        <Badge className={`h-fit py-2 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest ${
          status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-blue-600'
        }`}>
          {status === 'active' ? '● En Vivo' : 'Preparando...'}
        </Badge>
      </div>
    </div>
  )
}
