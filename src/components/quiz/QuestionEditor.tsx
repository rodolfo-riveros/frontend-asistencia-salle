
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
    onUpdate([...questions, { 
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    <div className="space-y-6">
      {questions.map((q, idx) => (
        <Card key={q.id || `temp-${idx}`} className="p-8 border-2 border-slate-100 rounded-[2rem] shadow-sm hover:border-primary/20 transition-all bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full w-2 bg-primary/10" />
          <div className="flex justify-between items-start mb-6">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-black uppercase text-[10px] tracking-widest px-3 py-1">PREGUNTA {idx + 1}</Badge>
            <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-500 rounded-full h-10 w-10" onClick={() => removeQuestion(q.id)}>
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Enunciado de la Pregunta</Label>
              <Input 
                value={q.text} 
                onChange={e => updateQ(q.id, 'text', e.target.value)}
                placeholder="¿Cuál es el concepto técnico de...?"
                className="h-14 rounded-2xl border-none bg-slate-50 shadow-inner font-bold text-lg focus-visible:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {q.options.map((opt: string, oIdx: number) => (
                <div key={`${q.id || idx}-opt-${oIdx}`} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                  q.correctIndex === oIdx ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-50 bg-white'
                }`}>
                  <button 
                    type="button"
                    onClick={() => updateQ(q.id, 'correctIndex', oIdx)}
                    className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                      q.correctIndex === oIdx ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {q.correctIndex === oIdx ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                  </button>
                  <Input 
                    value={opt} 
                    onChange={e => {
                      const newOpts = [...q.options];
                      newOpts[oIdx] = e.target.value;
                      updateQ(q.id, 'options', newOpts);
                    }}
                    placeholder={`Alternativa ${oIdx + 1}`}
                    className="border-none bg-transparent shadow-none font-bold placeholder:text-slate-300 text-sm focus-visible:ring-0"
                  />
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
               <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tiempo de Respuesta (segundos)</Label>
               <Input 
                 type="number" 
                 value={q.timeLimit} 
                 onChange={e => updateQ(q.id, 'timeLimit', parseInt(e.target.value) || 20)}
                 className="w-24 h-10 rounded-xl text-center font-black bg-slate-50 border-none shadow-inner"
               />
            </div>
          </div>
        </Card>
      ))}

      <Button 
        variant="outline" 
        onClick={addQuestion}
        className="w-full h-20 border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-[2rem] text-primary font-black uppercase text-xs gap-3 transition-all"
      >
        <PlusCircle className="h-6 w-6" /> Añadir Pregunta Manualmente
      </Button>
    </div>
  )
}
