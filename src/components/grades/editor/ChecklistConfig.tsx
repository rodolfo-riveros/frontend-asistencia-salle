"use client"

import * as React from "react"
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChecklistConfigProps {
  criteria: any[]
  setCriteria: (criteria: any[]) => void
}

export function ChecklistConfig({ criteria, setCriteria }: ChecklistConfigProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {criteria.map((cr, idx) => (
          <div key={idx} className="flex gap-4 items-center bg-white p-5 rounded-2xl border-2 border-slate-100 group hover:border-primary/20 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-black text-slate-300 text-xs shrink-0 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
              {idx + 1}
            </div>
            <Input 
              value={cr.description} 
              onChange={e => { const next = [...criteria]; next[idx].description = e.target.value; setCriteria(next); }} 
              placeholder="Define el criterio de cumplimiento (SI/NO)..." 
              className="border-none shadow-none font-bold text-slate-700 text-lg bg-transparent flex-1 focus-visible:ring-0 px-0" 
            />
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest">PTS</span>
              <Input 
                type="number" 
                value={cr.points} 
                onChange={e => { const next = [...criteria]; next[idx].points = parseInt(e.target.value) || 0; setCriteria(next); }} 
                className="w-14 h-9 bg-white border-2 border-slate-100 rounded-lg text-center font-black text-sm" 
              />
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => setCriteria(criteria.filter((_, i) => i !== idx))}>
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" className="w-full border-dashed border-2 h-16 rounded-2xl text-slate-400 font-black uppercase text-xs gap-3 hover:bg-slate-50 hover:text-primary transition-all" onClick={() => setCriteria([...criteria, { id: Date.now().toString(), description: "", points: 2 }])}>
        <Plus className="h-5 w-5" /> Añadir Nuevo Criterio de Verificación
      </Button>
    </div>
  )
}
