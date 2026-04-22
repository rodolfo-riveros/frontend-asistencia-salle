"use client"

import * as React from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface GuideEvaluatorProps {
  criteria: any[]
  evalData: Record<string, boolean>
  onUpdate: (data: Record<string, boolean>) => void
}

export function GuideEvaluator({ criteria, evalData, onUpdate }: GuideEvaluatorProps) {
  return (
    <div className="grid gap-4">
      {criteria.map((cr: any, i: number) => (
        <div key={i} className="flex items-center justify-between p-6 bg-white rounded-3xl shadow-sm border-2 border-slate-100 hover:border-primary/20 transition-all group">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-300 text-sm shrink-0 group-hover:bg-primary/5 group-hover:text-primary transition-colors border border-slate-100">
              {i + 1}
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-700 uppercase tracking-tight leading-relaxed max-w-xl">
                {cr.description}
              </p>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-md w-fit">
                PESO: {cr.points} PTS
              </p>
            </div>
          </div>
          <div className="flex gap-3 bg-slate-50 p-2 rounded-2xl border">
            <Button 
              size="sm" 
              variant="ghost" 
              className={cn(
                "h-14 w-14 rounded-xl transition-all duration-300", 
                evalData[i] === true 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110' 
                  : 'text-slate-200 hover:text-emerald-500 hover:bg-emerald-50'
              )} 
              onClick={() => onUpdate({ ...evalData, [i]: true })}
            >
              <CheckCircle2 className="h-7 w-7" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className={cn(
                "h-14 w-14 rounded-xl transition-all duration-300", 
                evalData[i] === false 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-110' 
                  : 'text-slate-200 hover:text-red-500 hover:bg-red-50'
              )} 
              onClick={() => onUpdate({ ...evalData, [i]: false })}
            >
              <XCircle className="h-7 w-7" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
