"use client"

import * as React from "react"
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface GuideConfigProps {
  criteria: any[]
  setCriteria: (criteria: any[]) => void
}

export function GuideConfig({ criteria, setCriteria }: GuideConfigProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {criteria.map((cr, idx) => (
          <div key={idx} className="flex gap-4 items-center bg-white p-6 rounded-3xl border-2 border-slate-100 group hover:border-primary/20 transition-all shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-300 text-sm shrink-0 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
              {idx + 1}
            </div>
            <Input 
              value={cr.description} 
              onChange={e => { const next = [...criteria]; next[idx].description = e.target.value; setCriteria(next); }} 
              placeholder="Paso o proceso técnico a observar..." 
              className="border-none shadow-none font-bold text-slate-700 text-lg bg-transparent flex-1 focus-visible:ring-0 px-0" 
            />
            <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
              <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">VALOR</span>
              <Input 
                type="number" 
                value={cr.points} 
                onChange={e => { const next = [...criteria]; next[idx].points = parseInt(e.target.value) || 0; setCriteria(next); }} 
                className="w-16 h-10 bg-white border-2 border-slate-100 rounded-xl text-center font-black text-base" 
              />
            </div>
            <Button variant="ghost" size="icon" className="h-12 w-12 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-2xl" onClick={() => setCriteria(criteria.filter((_, i) => i !== idx))}>
              <Trash2 className="h-6 w-6" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" className="w-full border-dashed border-2 h-20 rounded-3xl text-slate-400 font-black uppercase text-xs gap-3 hover:bg-slate-50 hover:text-primary transition-all" onClick={() => setCriteria([...criteria, { id: Date.now().toString(), description: "", points: 5 }])}>
        <Plus className="h-6 w-6" /> Añadir Paso Técnico a la Guía
      </Button>
    </div>
  )
}
