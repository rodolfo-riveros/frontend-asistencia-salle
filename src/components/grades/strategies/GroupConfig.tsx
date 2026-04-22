"use client"

import * as React from "react"
import { Users, CheckCircle2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface GroupConfigProps {
  students: any[]
  groupSize: number
  setGroupSize: (size: number) => void
  studentGroups: Record<string, string>
  setStudentGroups: (groups: Record<string, string>) => void
}

export function GroupConfig({ students, groupSize, setGroupSize, studentGroups, setStudentGroups }: GroupConfigProps) {
  const generateRandomGroups = () => {
    const shuffled = [...students].sort(() => Math.random() - 0.5)
    const newGroups: Record<string, string> = {}
    shuffled.forEach((s, i) => {
      const groupNum = Math.floor(i / groupSize) + 1
      newGroups[s.id] = `Grupo ${groupNum}`
    })
    setStudentGroups(newGroups)
    toast({ title: "Grupos Generados", description: "Se han mezclado los estudiantes aleatoriamente." })
  }

  return (
    <div className="space-y-6 p-8 bg-indigo-50/30 rounded-[2.5rem] border-2 border-indigo-100 border-dashed">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h4 className="text-xl font-black text-indigo-700 uppercase tracking-tighter flex items-center gap-2"><Users className="h-5 w-5" /> Configuración de Equipos</h4>
          <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">Vincular estudiantes por afinidad o azar</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-indigo-100">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Alumnos x Grupo</Label>
            <Input type="number" value={groupSize} onChange={e => setGroupSize(parseInt(e.target.value) || 2)} className="w-16 h-10 rounded-lg text-center font-black border-none bg-slate-50" />
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200" onClick={generateRandomGroups}>Mezclar Aleatorio</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {students.map(s => (
          <div key={s.id} className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6"><AvatarFallback className="text-[8px] font-black">{getInitials(s.nombre)}</AvatarFallback></Avatar>
              <span className="text-[10px] font-black uppercase truncate">{s.nombre.split(' ')[0]}</span>
            </div>
            <select 
              value={studentGroups[s.id] || ""} 
              onChange={e => setStudentGroups({ ...studentGroups, [s.id]: e.target.value })}
              className="w-full h-8 text-[9px] font-black uppercase tracking-widest border-2 rounded-lg bg-slate-50 border-slate-100 outline-none focus:border-indigo-300"
            >
              <option value="">Sin Grupo</option>
              {Array.from({ length: Math.ceil(students.length / 2) }, (_, i) => `Grupo ${i + 1}`).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
