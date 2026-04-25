
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
    <div className="space-y-12 max-w-full">
      {criteria.map((rc: any, i: number) => (
        <div key={rc.id || i} className="space-y-6 bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden group hover:border-primary/10 transition-all">
          <div className="flex items-center gap-4">
            <div className="h-10 w-2 bg-primary rounded-full group-hover:h-12 transition-all" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dimensión / Criterio {i + 1}</span>
              <Label className="text-2xl font-black uppercase text-slate-800 tracking-tighter leading-tight">
                {rc.category}
              </Label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {rc.levels.map((lvl: any, lIdx: number) => {
              // Comparamos numéricamente para asegurar persistencia
              const isActive = Number(evalData[i]) === Number(lvl.points)
              
              return (
                <Button 
                  key={`${rc.id || i}-${lvl.label}`} 
                  variant="outline" 
                  className={cn(
                    "h-auto flex-col gap-4 p-6 rounded-3xl border-2 transition-all text-left items-start overflow-hidden relative group min-w-0 w-full", 
                    isActive 
                      ? 'border-primary bg-primary/5 ring-4 ring-primary/5 shadow-md scale-[1.02]' 
                      : 'bg-white hover:border-slate-200'
                  )} 
                  onClick={() => onUpdate({ ...evalData, [i]: lvl.points })}
                >
                  {isActive && (
                    <div className="absolute top-0 right-0 p-2 text-primary animate-in fade-in zoom-in">
                      <Check className="h-4 w-4 stroke-[3px]" />
                    </div>
                  )}
                  <div className="flex justify-between items-center w-full mb-1 min-w-0">
                    <span className={cn(
                      "font-black text-[10px] uppercase tracking-widest transition-colors truncate",
                      isActive ? "text-primary" : "text-slate-400"
                    )}>
                      {lvl.label}
                    </span>
                    <Badge variant={isActive ? "default" : "outline"} className={cn(
                      "font-black text-[11px] px-3 py-1 rounded-xl shadow-sm shrink-0", 
                      isActive ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-400 border-slate-100'
                    )}>
                      {lvl.points} pts
                    </Badge>
                  </div>
                  <div className="w-full">
                    <p className={cn(
                      "text-[11px] leading-relaxed font-medium italic break-words",
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

function Badge({ children, variant = "default", className }: { children: React.ReactNode, variant?: "default" | "outline", className?: string }) {
  return (
    <div className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
      variant === "default" ? "bg-primary text-white border-primary" : "bg-transparent text-slate-400 border-slate-200",
      className
    )}>
      {children}
    </div>
  )
}
