
"use client"

import * as React from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ChecklistEvaluatorProps {
  criteria: any[]
  evalData: Record<string, boolean>
  onUpdate: (data: Record<string, boolean>) => void
}

export function ChecklistEvaluator({ criteria, evalData, onUpdate }: ChecklistEvaluatorProps) {
  return (
    <div className="grid gap-3">
      {criteria.map((cr: any, i: number) => (
        <div key={i} className="flex items-center justify-between p-5 bg-white rounded-2xl shadow-sm border-2 border-slate-100 hover:border-primary/20 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-300 text-xs shrink-0 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
              {i + 1}
            </div>
            <p className="text-sm font-bold text-slate-700 uppercase tracking-tight leading-relaxed max-w-xl">
              {cr.description}
            </p>
          </div>
          <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border">
            <Button 
              size="sm" 
              variant="ghost" 
              className={cn(
                "h-12 w-12 rounded-xl transition-all duration-300", 
                evalData[i] === true 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-110' 
                  : 'text-slate-200 hover:text-emerald-500 hover:bg-emerald-50'
              )} 
              onClick={() => onUpdate({ ...evalData, [i]: true })}
            >
              <CheckCircle2 className="h-6 w-6" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className={cn(
                "h-12 w-12 rounded-xl transition-all duration-300", 
                evalData[i] === false 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-110' 
                  : 'text-slate-200 hover:text-red-500 hover:bg-red-50'
              )} 
              onClick={() => onUpdate({ ...evalData, [i]: false })}
            >
              <XCircle className="h-6 w-6" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
