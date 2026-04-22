
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface RubricEvaluatorProps {
  criteria: any[]
  evalData: Record<string, number>
  onUpdate: (data: Record<string, number>) => void
}

export function RubricEvaluator({ criteria, evalData, onUpdate }: RubricEvaluatorProps) {
  return (
    <div className="space-y-12 max-w-full overflow-hidden">
      {criteria.map((rc: any, i: number) => (
        <div key={i} className="space-y-6 bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="h-10 w-2 bg-primary rounded-full" />
            <Label className="text-2xl font-black uppercase text-slate-800 tracking-tighter">
              {rc.category}
            </Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-hidden">
            {rc.levels.map((lvl: any) => {
              const isActive = evalData[i] === lvl.points
              return (
                <Button 
                  key={lvl.label} 
                  variant="outline" 
                  className={cn(
                    "h-auto flex-col gap-4 p-6 rounded-3xl border-2 transition-all text-left items-start overflow-hidden relative group min-w-0 w-full", 
                    isActive 
                      ? 'border-primary bg-primary/5 ring-4 ring-primary/5' 
                      : 'bg-white hover:border-slate-300'
                  )} 
                  onClick={() => onUpdate({ ...evalData, [i]: lvl.points })}
                >
                  {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-in slide-in-from-left" />}
                  <div className="flex justify-between items-center w-full mb-1 min-w-0">
                    <span className="font-black text-[10px] uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors truncate">
                      {lvl.label}
                    </span>
                    <span className={cn(
                      "font-black text-[11px] px-3 py-1 rounded-xl shadow-sm shrink-0", 
                      isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    )}>
                      {lvl.points} pts
                    </span>
                  </div>
                  <div className="w-full overflow-hidden">
                    <p className="text-[11px] leading-relaxed text-slate-600 font-medium italic break-words w-full">
                      {lvl.description || 'Sin detalles configurados para este nivel de desempeño.'}
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
