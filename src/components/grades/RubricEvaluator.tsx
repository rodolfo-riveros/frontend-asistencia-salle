
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Check } from "lucide-react"

interface RubricEvaluatorProps {
  criteria: any[]
  evalData: Record<string, number>
  onUpdate: (data: Record<string, number>) => void
}

export function RubricEvaluator({ criteria, evalData, onUpdate }: RubricEvaluatorProps) {
  return (
    <div className="space-y-12 max-w-full pb-10">
      {criteria.map((rc: any, i: number) => (
        <div key={rc.id || i} className="space-y-6 bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden group hover:border-primary/10 transition-all">
          <div className="flex items-center gap-4">
            <div className="h-10 w-2 bg-primary rounded-full group-hover:h-12 transition-all" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dimensión / Criterio {i + 1}</span>
              <Label className="text-xl md:text-2xl font-black uppercase text-slate-800 tracking-tighter leading-tight">
                {rc.category}
              </Label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {rc.levels.map((lvl: any, lIdx: number) => {
              const isActive = Number(evalData[i]) === Number(lvl.points)
              
              return (
                <Button 
                  key={`${rc.id || i}-${lvl.label}`} 
                  variant="outline" 
                  className={cn(
                    "h-auto min-h-[160px] flex-col gap-4 p-6 rounded-3xl border-2 transition-all text-left items-start overflow-visible relative group w-full whitespace-normal", 
                    isActive 
                      ? 'border-primary bg-primary/5 ring-4 ring-primary/5 shadow-md scale-[1.02]' 
                      : 'bg-white hover:border-slate-200'
                  )} 
                  onClick={() => onUpdate({ ...evalData, [i]: lvl.points })}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2 text-primary animate-in fade-in zoom-in z-10">
                      <Check className="h-5 w-5 stroke-[3px]" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 w-full mb-1">
                    <span className={cn(
                      "font-black text-[11px] uppercase tracking-widest transition-colors leading-tight",
                      isActive ? "text-primary" : "text-slate-400"
                    )}>
                      {lvl.label}
                    </span>
                    <div className={cn(
                      "font-black text-[11px] px-4 py-1.5 rounded-xl shadow-sm w-fit", 
                      isActive ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400 border border-slate-100'
                    )}>
                      {lvl.points} pts
                    </div>
                  </div>
                  <div className="w-full">
                    <p className={cn(
                      "text-[12px] leading-relaxed font-medium italic whitespace-normal",
                      isActive ? "text-slate-700" : "text-slate-500"
                    )}>
                      {lvl.description || 'Sin descripción para este nivel.'}
                    </p>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
