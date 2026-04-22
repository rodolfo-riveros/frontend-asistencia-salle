
"use client"

import * as React from "react"
import { CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ScaleEvaluatorProps {
  criteria: any[]
  scaleLevels: any[]
  evalData: Record<string, number>
  onUpdate: (data: Record<string, number>) => void
}

export function ScaleEvaluator({ criteria, scaleLevels, evalData, onUpdate }: ScaleEvaluatorProps) {
  const handleSelect = (idx: number, points: number) => {
    onUpdate({ ...evalData, [idx]: points })
  }

  // Ordenar niveles por puntaje descendente para la cabecera
  const sortedLevels = [...(scaleLevels || [])].sort((a, b) => b.points - a.points)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="p-6 text-left font-black text-[10px] uppercase text-slate-400 tracking-widest border-b-2 border-slate-100">
                Indicador de Desempeño
              </th>
              {sortedLevels.map((lvl) => (
                <th key={lvl.label} className="p-6 text-center font-black text-[10px] uppercase text-slate-400 tracking-widest border-b-2 border-slate-100 border-l">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-slate-900">{lvl.label}</span>
                    <span className="text-primary/40 font-mono">({lvl.points} pts)</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((cr, idx) => (
              <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
                <td className="p-6 border-b border-slate-100">
                  <div className="flex gap-4 items-start">
                    <span className="font-black text-xs text-slate-300 mt-0.5">{idx + 1}</span>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed uppercase tracking-tight">
                      {cr.description}
                    </p>
                  </div>
                </td>
                {sortedLevels.map((lvl) => {
                  const isActive = evalData[idx] === lvl.points
                  const isPositive = lvl.points >= (sortedLevels[0].points * 0.7)
                  
                  return (
                    <td key={lvl.label} className="p-0 border-b border-slate-100 border-l text-center">
                      <button
                        onClick={() => handleSelect(idx, lvl.points)}
                        className={cn(
                          "w-full h-full min-h-[80px] flex items-center justify-center transition-all outline-none",
                          isActive 
                            ? isPositive 
                              ? "bg-emerald-50 text-emerald-600" 
                              : "bg-amber-50 text-amber-600"
                            : "hover:bg-slate-50 text-slate-200"
                        )}
                      >
                        {isActive ? (
                          <div className="flex flex-col items-center gap-1 animate-in zoom-in-50 duration-300">
                            <CheckCircle2 className="h-7 w-7" />
                            <span className="text-[10px] font-black uppercase">MARCADO</span>
                          </div>
                        ) : (
                          <Circle className="h-6 w-6 opacity-20" />
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
