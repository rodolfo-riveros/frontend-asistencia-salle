"use client"

import * as React from "react"
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ScaleConfigProps {
  criteria: any[]
  setCriteria: (criteria: any[]) => void
}

export function ScaleConfig({ criteria, setCriteria }: ScaleConfigProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {criteria.map((cr, idx) => (
          <div key={idx} className="flex gap-4 items-center bg-white p-5 rounded-2xl border-2 border-slate-100 group hover:border-primary/20 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-black text-slate-300 text-xs shrink-0">{idx + 1}</div>
            <Input 
              value={cr.description} 
              onChange={e => { const next = [...criteria]; next[idx].description = e.target.value; setCriteria(next); }} 
              placeholder="Indicador de desempeño a escalar..." 
              className="border-none shadow-none font-bold text-slate-700 text-lg bg-transparent flex-1 focus-visible:ring-0 px-0" 
            />
            <Button variant="ghost" size="icon" className="h-10 w-10 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl" onClick={() => setCriteria(criteria.filter((_, i) => i !== idx))}>
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" className="w-full border-dashed border-2 h-16 rounded-2xl text-slate-400 font-black uppercase text-xs gap-3 hover:bg-slate-50 hover:text-primary transition-all" onClick={() => setCriteria([...criteria, { id: Date.now().toString(), description: "" }])}>
        <Plus className="h-5 w-5" /> Añadir Nuevo Indicador de Escala
      </Button>
    </div>
  )
}
