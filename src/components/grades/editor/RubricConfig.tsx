"use client"

import * as React from "react"
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const DEFAULT_RUBRIC_LEVELS = [
  { label: 'Excelente', points: 4, description: '' },
  { label: 'Bueno', points: 3, description: '' },
  { label: 'Regular', points: 2, description: '' },
  { label: 'Deficiente', points: 1, description: '' },
  { label: 'No presenta', points: 0, description: '' },
]

interface RubricConfigProps {
  criteria: any[]
  setCriteria: (criteria: any[]) => void
}

export function RubricConfig({ criteria, setCriteria }: RubricConfigProps) {
  return (
    <div className="space-y-10">
      {criteria.map((rc, idx) => (
        <div key={idx} className="p-8 bg-slate-50/50 rounded-[2.5rem] border-2 border-slate-100 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-primary rounded-full" />
              <Input 
                value={rc.category} 
                onChange={e => { const next = [...criteria]; next[idx].category = e.target.value; setCriteria(next); }} 
                className="font-black uppercase text-sm tracking-widest bg-transparent border-none p-0 h-auto w-[400px] focus-visible:ring-0" 
                placeholder="NOMBRE DE LA DIMENSIÓN A EVALUAR" 
              />
            </div>
            <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => setCriteria(criteria.filter((_, i) => i !== idx))}>
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {rc.levels.map((lvl: any, lIdx: number) => (
              <div key={lIdx} className="bg-white p-4 rounded-2xl border-2 border-slate-100 space-y-3 shadow-sm flex flex-col min-w-0">
                <div className="flex justify-between items-center">
                  <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest truncate">{lvl.label}</span>
                  <Badge variant="outline" className="font-black text-primary text-[10px] bg-primary/5 border-primary/20 shrink-0">{lvl.points} pts</Badge>
                </div>
                <textarea 
                  value={lvl.description} 
                  onChange={e => { const next = [...criteria]; next[idx].levels[lIdx].description = e.target.value; setCriteria(next); }} 
                  className="w-full resize-none border-none text-[11px] font-medium h-24 bg-slate-50/50 p-3 rounded-xl focus:bg-white transition-colors break-words" 
                  placeholder="Descripción del nivel..." 
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full border-dashed border-2 h-20 rounded-[2rem] text-slate-400 font-black uppercase text-xs gap-3 hover:bg-slate-50 hover:text-primary transition-all" onClick={() => setCriteria([...criteria, { id: Date.now().toString(), category: "", levels: JSON.parse(JSON.stringify(DEFAULT_RUBRIC_LEVELS)) }])}>
        <Plus className="h-6 w-6" /> Añadir Nueva Dimensión a la Rúbrica
      </Button>
    </div>
  )
}
