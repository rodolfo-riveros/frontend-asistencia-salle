
"use client"

import * as React from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Loader2, Calculator, Star, Target } from "lucide-react"
import { ChecklistEvaluator } from "./ChecklistEvaluator"
import { RubricEvaluator } from "./RubricEvaluator"
import { ScaleEvaluator } from "./ScaleEvaluator"
import { GuideEvaluator } from "./GuideEvaluator"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface EvaluationModalProps {
  activeEval: any
  onClose: () => void
  evalData: any
  setEvalData: (data: any) => void
  evalComment: string
  setEvalComment: (comment: string) => void
  instruments: Record<string, any>
  handleGradeChange: (studentId: string, columnId: string, value: string, overrideDetails?: any, overrideComment?: string) => Promise<void>
}

const INST_LABELS: Record<string, string> = {
  manual: 'Nota Directa',
  cotejo: 'Lista de Cotejo',
  rubrica: 'Rúbrica',
  escala: 'Escala Valorativa',
  anecdotario: 'Guía Observación'
}

export function EvaluationModal({ 
  activeEval, onClose, evalData, setEvalData, evalComment, setEvalComment, 
  instruments, handleGradeChange
}: EvaluationModalProps) {
  
  const [isApplying, setIsApplying] = React.useState(false)

  if (!activeEval) return null;
  const column = activeEval.column;
  const student = activeEval.student;
  const instrument = instruments[column.instrumentId];

  const calculateScore = () => {
    if (!instrument) return 0;
    
    if (column.type === 'cotejo' || column.type === 'anecdotario') {
      const criteria = instrument.criteria || [];
      return Math.round(Object.entries(evalData).reduce((acc, [idx, val]) => val === true ? acc + (criteria[parseInt(idx)]?.points || (20/(criteria.length || 1))) : acc, 0));
    }
    
    if (column.type === 'escala') {
      if (!instrument.scaleLevels) return 0;
      const maxPtsPerItem = Math.max(...instrument.scaleLevels!.map((l: any) => l.points));
      const totalPossible = instrument.criteria.length * maxPtsPerItem;
      const obtained = Object.values(evalData).reduce((acc, v) => acc + (Number(v) || 0), 0);
      return Math.round((obtained / (totalPossible || 1)) * 20);
    }
    
    if (column.type === 'rubrica') {
      const obtained = Object.values(evalData).reduce((acc, v) => acc + (Number(v) || 0), 0);
      return Math.round(obtained);
    }

    return Object.values(evalData).reduce((acc, v) => acc + (Number(v) || 0), 0);
  };

  const score = calculateScore();
  const showObservations = column.type === 'cotejo' || column.type === 'anecdotario';
  const showScoreInHeader = column.type === 'rubrica' || column.type === 'escala';

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await handleGradeChange(
        student.id, 
        column.id, 
        score.toString(), 
        evalData, 
        evalComment
      );
      
      toast({ title: "Nota Aplicada", description: `Se ha registrado ${score} para ${student.nombre}.` });
      onClose();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la calificación." });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={!!activeEval} onOpenChange={(o) => { if(!o) onClose(); }}>
      <DialogContent className="max-w-[95vw] p-0 overflow-hidden border-none shadow-2xl rounded-[1.5rem] md:rounded-[3rem] flex flex-col h-[95vh] md:h-[90vh]">
        <DialogHeader className="p-6 md:p-10 bg-primary text-white space-y-4 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white font-black uppercase text-[9px] md:text-[10px]">{column.type ? INST_LABELS[column.type].toUpperCase() : "EVALUACIÓN"}</Badge>
                {column.strategy === 'grupal' && <Badge className="bg-blue-400 text-white font-black uppercase text-[9px] md:text-[10px]">EQUIPO: {column.groups?.[student.id]}</Badge>}
              </div>
              <DialogTitle className="text-xl md:text-3xl font-black uppercase tracking-tighter leading-tight">
                {student.nombre}
              </DialogTitle>
              <DialogDescription className="text-blue-100/80 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">
                Instrumento: {column.name}
              </DialogDescription>
            </div>

            {showScoreInHeader && (
              <div className="bg-white/10 backdrop-blur-md px-8 py-4 rounded-[2rem] border border-white/20 flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Nota Calculada</span>
                <span className="text-5xl font-black font-mono leading-none">{score.toString().padStart(2, '0')}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden bg-white">
          <div className="flex-grow overflow-hidden flex flex-col">
            <ScrollArea className="p-4 md:p-10 bg-slate-50/50 flex-grow">
              {instrument ? (
                <div className="max-w-full">
                  {column.type === 'cotejo' && <ChecklistEvaluator criteria={instrument.criteria} evalData={evalData} onUpdate={setEvalData} />}
                  {column.type === 'rubrica' && <RubricEvaluator criteria={instrument.criteria} evalData={evalData} onUpdate={setEvalData} />}
                  {column.type === 'escala' && <ScaleEvaluator criteria={instrument.criteria} scaleLevels={instrument.scaleLevels!} evalData={evalData} onUpdate={setEvalData} />}
                  {column.type === 'anecdotario' && <GuideEvaluator criteria={instrument.criteria} evalData={evalData} onUpdate={setEvalData} />}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 font-bold uppercase text-xs">
                  Cargando configuración del instrumento...
                </div>
              )}
            </ScrollArea>
          </div>
          
          {showObservations && (
            <div className="w-full lg:w-[420px] p-6 md:p-10 bg-white border-t lg:border-t-0 lg:border-l flex flex-col gap-8 shrink-0">
              <div className="space-y-4">
                <Label className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                  <Calculator className="h-3 w-3" /> RESULTADO ACTUAL
                </Label>
                <div className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-100 text-center shadow-inner group transition-all hover:bg-white hover:border-primary/20">
                  <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Puntaje Obtenido</p>
                  <p className="text-6xl md:text-7xl font-black font-mono text-primary leading-none">{score.toString().padStart(2, '0')}</p>
                </div>
              </div>

              <div className="space-y-3 flex-1 flex flex-col">
                <Label className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 shrink-0">
                  <MessageSquare className="h-3 w-3" /> OBSERVACIONES ACADÉMICAS
                </Label>
                <Textarea 
                  value={evalComment} 
                  onChange={e => setEvalComment(e.target.value)} 
                  placeholder="Comentarios pedagógicos..." 
                  className="flex-1 min-h-[150px] rounded-2xl border-2 border-slate-100 resize-none p-6 font-medium italic text-slate-600 shadow-inner bg-slate-50/30 focus:bg-white focus:border-primary/20 transition-all text-sm leading-relaxed" 
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 md:p-10 bg-white border-t flex flex-row justify-end gap-3 md:gap-4 shrink-0">
          <Button variant="ghost" className="flex-1 sm:flex-none font-black text-slate-400 uppercase text-[10px] md:text-xs px-4 md:px-12 h-12 md:h-16 rounded-xl md:rounded-2xl border-2" onClick={onClose}>Descartar</Button>
          <Button disabled={isApplying} className="flex-1 sm:flex-none bg-primary font-black uppercase text-[10px] md:text-xs px-4 md:px-12 h-12 md:h-16 rounded-xl md:rounded-2xl shadow-xl text-white transition-all active:scale-95" onClick={handleApply}>
            {isApplying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Finalizar Calificación
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
