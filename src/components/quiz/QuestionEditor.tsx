"use client"

import * as React from "react"
import { Trash2, PlusCircle, CheckCircle2, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function QuestionEditor({ questions, onUpdate }: { questions: any[], onUpdate: (qs: any[]) => void }) {
  const addQuestion = () => {
    const newId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    onUpdate([...questions, { 
      id: newId,
      text: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      timeLimit: 20
    }])
  }

  const removeQuestion = (id: string) => {
    onUpdate(questions.filter(q => q.id !== id))
  }

  const updateQ = (id: string, field: string, value: any) => {
    onUpdate(questions.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  return (
    <div className="space-y-8">
      {(questions || []).map((q, idx) => {
        const itemKey = q.id || `q-key-idx-${idx}`
        
        return (
          <Card key={itemKey} className="p-10 border-2 border-slate-100 rounded-[2.5rem] shadow-sm hover:border-primary/20 transition-all bg-white overflow-hidden relative group">
            <div className="absolute top-0 left-0 h-full w-2 bg-primary/5 group-hover:bg-primary/20 transition-colors" />
            <div className="flex justify-between items-start mb-8">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-black uppercase text-[10px] tracking-[0.2em] px-5 py-1.5 rounded-full">PREGUNTA TÉCNICA {idx + 1}</Badge>
              <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full h-12 w-12 transition-all" onClick={() => removeQuestion(q.id)}>
                <Trash2 className="h-6 w-6" />
              </Button>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Enunciado de la Pregunta</Label>
                <Input 
                  value={q.text} 
                  onChange={e => updateQ(q.id, 'text', e.target.value)}
                  placeholder="Define el concepto o problema técnico aquí..."
                  className="h-16 rounded-2xl border-none bg-slate-50 shadow-inner font-bold text-lg focus-visible:ring-primary/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {q.options.map((opt: string, oIdx: number) => (
                  <div key={`${itemKey}-opt-${oIdx}`} className={cn(
                    "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300",
                    q.correctIndex === oIdx ? 'border-emerald-500/50 bg-emerald-50/30' : 'border-slate-50 bg-white'
                  )}>
                    <button 
                      type="button"
                      onClick={() => updateQ(q.id, 'correctIndex', oIdx)}
                      className={cn(
                        "shrink-0 h-12 w-12 rounded-xl flex items-center justify-center transition-all shadow-sm",
                        q.correctIndex === oIdx ? 'bg-emerald-500 text-white scale-110' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                      )}
                    >
                      {q.correctIndex === oIdx ? <CheckCircle2 className="h-7 w-7" /> : <Circle className="h-7 w-7" />}
                    </button>
                    <Input 
                      value={opt} 
                      onChange={e => {
                        const newOpts = [...q.options];
                        newOpts[oIdx] = e.target.value;
                        updateQ(q.id, 'options', newOpts);
                      }}
                      placeholder={`Alternativa ${oIdx + 1}`}
                      className="border-none bg-transparent shadow-none font-black text-slate-700 placeholder:text-slate-300 text-sm focus-visible:ring-0 px-0 h-auto"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-5 pt-8 border-t border-slate-50">
                 <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 shadow-inner">
                    <Clock className="h-5 w-5 text-slate-400" />
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] shrink-0">Tiempo de Respuesta</Label>
                    <Input 
                      type="number" 
                      value={q.timeLimit} 
                      onChange={e => updateQ(q.id, 'timeLimit', parseInt(e.target.value) || 20)}
                      className="w-20 h-10 rounded-xl text-center font-black bg-white border-2 border-slate-100 shadow-none text-primary"
                    />
                    <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">SEG</span>
                 </div>
              </div>
            </div>
          </Card>
        )
      })}

      <Button 
        variant="outline" 
        onClick={addQuestion}
        className="w-full h-24 border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-[2.5rem] text-primary font-black uppercase text-xs gap-4 transition-all hover:scale-[1.01] active:scale-95"
      >
        <PlusCircle className="h-7 w-7" /> Añadir Pregunta Manual de Alta Exigencia
      </Button>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

import { Clock } from "lucide-react"
