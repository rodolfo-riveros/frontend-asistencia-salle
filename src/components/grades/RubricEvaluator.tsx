
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
    <div className="space-y-12">
      {criteria.map((rc: any, i: number) => (
        <div key={i} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1.5 bg-primary rounded-full" />
            <Label className="text-xl font-black uppercase text-slate-800 tracking-tighter">
              {rc.category}
            </Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {rc.levels.map((lvl: any) => {
              const isActive = evalData[i] === lvl.points
              return (
                <Button 
                  key={lvl.label} 
                  variant="outline" 
                  className={cn(
                    "h-auto flex-col gap-3 p-6 rounded-3xl border-2 transition-all text-left items-start overflow-hidden relative group", 
                    isActive 
                      ? 'border-primary bg-primary/5 ring-4 ring-primary/5' 
                      : 'bg-white hover:border-slate-300'
                  )} 
                  onClick={() => onUpdate({ ...evalData, [i]: lvl.points })}
                >
                  {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-in slide-in-from-left" />}
                  <div className="flex justify-between w-full mb-1">
                    <span className="font-black text-[9px] uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">
                      {lvl.label}
                    </span>
                    <span className={cn(
                      "font-black text-xs px-2 py-0.5 rounded-lg", 
                      isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    )}>
                      {lvl.points} pts
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 font-medium break-words w-full italic">
                    {lvl.description || 'Sin detalles configurados.'}
                  </p>
                </Button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
