
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogTitle,
  DialogHeader
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  BookOpen, 
  History, 
  FileText, 
  LayoutList, 
  Target, 
  Star, 
  Quote, 
  User, 
  Users, 
  Gamepad2, 
  CheckCircle2, 
  Sparkles, 
  Loader2,
  Plus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ChecklistConfig } from "./editor/ChecklistConfig"
import { RubricConfig } from "./editor/RubricConfig"
import { ScaleConfig } from "./editor/ScaleConfig"
import { GuideConfig } from "./editor/GuideConfig"
import { GroupConfig } from "./strategies/GroupConfig"
import { QuestionEditor } from "@/components/quiz/QuestionEditor"

import { api } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { analyzeInstrument } from "@/ai/flows/analyze-instrument-flow"
import { generateQuiz } from "@/ai/flows/generate-quiz-flow"

interface ConfigWizardProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  unidadId: string
  periodoId: string
  setupStep: number
  setSetupStep: (step: number) => void
  newIndicatorCode: string
  setNewIndicatorCode: (val: string) => void
  newIndicatorDescription: string
  setNewIndicatorDescription: (val: string) => void
  newIndicatorWeight: number
  setNewIndicatorWeight: (val: number) => void
  existingIndicators: any[]
  newInstType: 'manual' | 'cotejo' | 'rubrica' | 'escala' | 'anecdotario' | 'quizz'
  setNewInstType: (val: any) => void
  newStrategyType: 'individual' | 'grupal' | 'quizz'
  setNewStrategyType: (val: any) => void
  newColName: string
  setNewColName: (val: string) => void
  newInstrumentWeight: number
  setNewInstrumentWeight: (val: number) => void
  newMaxPoints: number
  setNewMaxPoints: (val: number) => void
  editorCriteria: any[]
  setEditorCriteria: (val: any[]) => void
  fileInputRef: React.RefObject<HTMLInputElement>
  totalPointsStep: number
  students: any[]
  groupSize: number
  setGroupSize: (val: number) => void
  studentGroups: Record<string, string>
  setStudentGroups: (val: Record<string, string>) => void
  addColumn: () => void
  resetEditor: () => void
}

export function ConfigWizard({ 
  isOpen, setIsOpen, unidadId, periodoId, setupStep, setSetupStep, newIndicatorCode, setNewIndicatorCode,
  newIndicatorDescription, setNewIndicatorDescription, newIndicatorWeight, setNewIndicatorWeight,
  existingIndicators, newInstType, setNewInstType, newStrategyType, setNewStrategyType,
  newColName, setNewColName, newInstrumentWeight, setNewInstrumentWeight, newMaxPoints, setNewMaxPoints,
  editorCriteria, setEditorCriteria, fileInputRef,
  students, groupSize, setGroupSize, studentGroups, setStudentGroups, addColumn, resetEditor
}: ConfigWizardProps) {
  
  const [isFinishing, setIsFinishing] = React.useState(false)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = React.useState(false)
  const [registeredIndicatorId, setRegisteredIndicatorId] = React.useState<string | null>(null)
  const [registeredEvalId, setRegisteredEvalId] = React.useState<string | null>(null)
  const [isScanning, setIsScanning] = React.useState(false)
  const [quizQuestions, setQuizQuestions] = React.useState<any[]>([])
  const [isFromLibrary, setIsFromLibrary] = React.useState(false)

  const handleAiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const analysis = await analyzeInstrument({ 
        photoDataUri: base64,
        expectedType: newInstType 
      });
      
      if (analysis.name) setNewColName(analysis.name);
      if (analysis.suggestedWeight) setNewInstrumentWeight(analysis.suggestedWeight);
      
      let parsedCriteria: any[] = [];
      if (analysis.checklistCriteria && (newInstType === 'cotejo' || newInstType === 'anecdotario')) {
        parsedCriteria = analysis.checklistCriteria.map(c => ({ 
          id: `cr-${Math.random().toString(36).substr(2, 9)}`, 
          description: c.description, 
          points: c.points 
        }));
      } else if (analysis.rubricDimensions && newInstType === 'rubrica') {
        parsedCriteria = analysis.rubricDimensions.map(d => ({
          id: `rb-${Math.random().toString(36).substr(2, 9)}`,
          category: d.category,
          levels: d.levels
        }));
      } else if (analysis.checklistCriteria && newInstType === 'escala') {
        parsedCriteria = analysis.checklistCriteria.map(c => ({
          id: `sc-${Math.random().toString(36).substr(2, 9)}`,
          description: c.description
        }));
      }

      if (parsedCriteria.length > 0) {
        setEditorCriteria(parsedCriteria);
        toast({ title: "Digitalización Exitosa", description: "El instrumento ha sido estructurado correctamente." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Fallo de Digitalización", description: err.message });
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGenerateQuizQuestions = async () => {
    if (!editorCriteria.length) {
      return toast({ variant: "destructive", title: "Sin Criterios", description: "Primero digitaliza los criterios técnicos en el paso anterior." });
    }
    setIsGeneratingQuiz(true);
    try {
      const result = await generateQuiz({
        criteria: editorCriteria.map((c, i) => ({ 
          id: c.id || i.toString(), 
          description: c.description || c.category 
        })),
        subjectName: newColName
      });
      
      const questionsWithIds = result.questions.map((q: any) => ({
        ...q,
        id: `q-${Math.random().toString(36).substr(2, 9)}`
      }));
      
      setQuizQuestions(questionsWithIds);
      toast({ title: "Quizz Generado", description: "Se han creado preguntas de alta exigencia técnica." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de IA", description: e.message });
    } finally {
      setIsGeneratingQuiz(false);
    }
  }

  const registerStep0 = async () => {
    // Si viene de la biblioteca y ya tenemos el ID, no intentamos modificarlo (evita Error 400)
    if (isFromLibrary && registeredIndicatorId) {
      setSetupStep(1)
      return
    }

    setIsFinishing(true)
    try {
      const payload = {
        unidad_id: unidadId,
        periodo_id: periodoId,
        codigo: newIndicatorCode,
        descripcion: newIndicatorDescription,
        peso_porcentaje: newIndicatorWeight
      }
      let res: any;
      if (registeredIndicatorId) {
        // Solo llegamos aquí si NO es de la biblioteca pero ya registramos uno en esta sesión
        res = await api.patch(`/evaluaciones/indicadores/${registeredIndicatorId}`, payload)
      } else {
        res = await api.post('/evaluaciones/indicadores/', payload)
      }
      setRegisteredIndicatorId(res.id)
      setSetupStep(1)
      toast({ title: "Indicador Registrado" })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Atención", description: e.message })
    } finally {
      setIsFinishing(false)
    }
  }

  const registerStep2 = async () => {
    setIsFinishing(true)
    try {
      const payload = {
        indicador_id: registeredIndicatorId,
        periodo_id: periodoId,
        nombre: newColName,
        tipo: newStrategyType === 'quizz' ? 'quizz' : newInstType,
        peso_instrumento: newInstrumentWeight,
        puntaje_maximo: newMaxPoints,
        configuracion_json: { strategy: newStrategyType, criteria: editorCriteria }
      }
      let res: any = await api.post('/evaluaciones/', payload)
      setRegisteredEvalId(res.id)
      if (newInstType === 'manual') {
        toast({ title: "Registro Exitoso", description: "La columna ha sido añadida al registro auxiliar." })
        addColumn(); setIsOpen(false); resetEditor();
      } else {
        setSetupStep(3)
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: e.message })
    } finally {
      setIsFinishing(false)
    }
  }

  const registerStep3 = async () => {
    if (!registeredEvalId) return;
    setIsFinishing(true)
    try {
      const payload = {
        configuracion_json: { strategy: newStrategyType, criteria: editorCriteria }
      }
      await api.patch(`/evaluaciones/${registeredEvalId}`, payload)
      if (newStrategyType === 'grupal') setSetupStep(4)
      else if (newStrategyType === 'quizz') setSetupStep(5)
      else {
        toast({ title: "Instrumento Guardado" })
        addColumn(); setIsOpen(false); resetEditor();
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message })
    } finally {
      setIsFinishing(false)
    }
  }

  const registerStep4 = async () => {
    setIsFinishing(true);
    try {
      const groupsMap: Record<string, string[]> = {};
      Object.entries(studentGroups).forEach(([studentId, groupName]) => {
        if (!groupsMap[groupName]) groupsMap[groupName] = [];
        groupsMap[groupName].push(studentId);
      });
      await api.post('/evaluaciones/grupos/', {
        evaluacion_id: registeredEvalId,
        grupos: Object.entries(groupsMap).map(([name, ids]) => ({ nombre_grupo: name, integrantes: ids }))
      });
      toast({ title: "Equipos Formados" });
      addColumn(); setIsOpen(false); resetEditor();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error en Grupos", description: e.message });
    } finally {
      setIsFinishing(false);
    }
  }

  const registerStep5 = async () => {
    if (!registeredEvalId || quizQuestions.length === 0) return;
    setIsFinishing(true);
    try {
      await api.patch(`/evaluaciones/${registeredEvalId}`, {
        configuracion_json: { 
          strategy: 'quizz', 
          criteria: editorCriteria, 
          questions: quizQuestions 
        }
      });
      toast({ title: "Gamificación Registrada", description: "Configuración guardada en el Registro Auxiliar." });
      addColumn(); setIsOpen(false); resetEditor();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsFinishing(false);
    }
  }

  const handleNext = () => {
    if (setupStep === 0) registerStep0();
    else if (setupStep === 1) setSetupStep(2);
    else if (setupStep === 2) registerStep2();
    else if (setupStep === 3) registerStep3();
    else if (setupStep === 4) registerStep4();
    else if (setupStep === 5) registerStep5();
  }

  const handleBack = () => setSetupStep(Math.max(0, setupStep - 1));

  const handleStartNewIndicator = () => {
    setRegisteredIndicatorId(null);
    setNewIndicatorCode("");
    setNewIndicatorDescription("");
    setNewIndicatorWeight(0);
    setIsFromLibrary(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if(!isFinishing) { setIsOpen(o); if(!o) { resetEditor(); setRegisteredIndicatorId(null); setRegisteredEvalId(null); setIsFromLibrary(false); } } }}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col h-[90vh]">
        <DialogHeader className="bg-primary h-28 flex flex-col justify-center px-10 text-white shrink-0">
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">Configuración de Evaluación</DialogTitle>
          <DialogDescription className="text-blue-100/80 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
            PASO {setupStep + 1}: {setupStep === 0 ? "Indicador de Logro" : setupStep === 1 ? "Instrumento" : setupStep === 2 ? "Actividad" : setupStep === 3 ? "Diseño" : setupStep === 4 ? "Equipos" : "Gamificación"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-hidden flex flex-col bg-white">
          <ScrollArea className="flex-grow">
            <div className="p-10 flex flex-col items-center">
              {setupStep === 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 w-full max-w-4xl">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><BookOpen className="h-6 w-6" /></div>
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Criterio de Logro</h4>
                      </div>
                      {isFromLibrary && (
                        <Button variant="outline" size="sm" onClick={handleStartNewIndicator} className="h-8 border-primary text-primary font-bold text-[10px] uppercase gap-1.5 px-3 rounded-full hover:bg-primary/5">
                          <Plus className="h-3 w-3" /> Crear Nuevo
                        </Button>
                      )}
                    </div>
                    <div className="bg-slate-50/50 p-8 rounded-[2rem] border-2 border-slate-100 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] ml-1">Código</Label>
                          <Input 
                            value={newIndicatorCode} 
                            onChange={e => setNewIndicatorCode(e.target.value.toUpperCase())} 
                            placeholder="Ej: C1.I1" 
                            disabled={isFromLibrary}
                            className="h-12 border-none shadow-inner rounded-xl font-black text-lg bg-white disabled:opacity-50" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] ml-1">Peso %</Label>
                          <Input 
                            type="number" 
                            value={newIndicatorWeight || ""} 
                            onChange={e => setNewIndicatorWeight(parseInt(e.target.value) || 0)} 
                            disabled={isFromLibrary}
                            className="h-12 border-none shadow-inner rounded-xl font-black text-center text-lg bg-white disabled:opacity-50" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] ml-1">Logro de Aprendizaje</Label>
                        <Textarea 
                          value={newIndicatorDescription} 
                          onChange={e => setNewIndicatorDescription(e.target.value)} 
                          placeholder="Describe el resultado esperado..." 
                          disabled={isFromLibrary}
                          className="h-24 border-none shadow-inner rounded-2xl bg-white resize-none disabled:opacity-50" 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary"><History className="h-6 w-6" /></div>
                      <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Biblioteca</h4>
                    </div>
                    <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-6 min-h-[250px] space-y-3">
                      {existingIndicators.map((ind: any) => {
                        const isSelected = registeredIndicatorId === ind.id;
                        return (
                          <button 
                            key={ind.id} 
                            onClick={() => { 
                              setNewIndicatorCode(ind.codigo); 
                              setNewIndicatorDescription(ind.descripcion); 
                              setNewIndicatorWeight(ind.peso_porcentaje); 
                              setRegisteredIndicatorId(ind.id); 
                              setIsFromLibrary(true);
                            }} 
                            className={cn(
                              "flex flex-col items-start p-4 rounded-2xl border-2 w-full text-left transition-all", 
                              isSelected 
                                ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20" 
                                : "border-slate-50 hover:border-primary/30 bg-slate-50/30"
                            )}
                          >
                            <div className="flex justify-between w-full font-black text-sm text-primary mb-1">
                               <span className="flex items-center gap-2">
                                 {isSelected && <CheckCircle2 className="h-4 w-4" />}
                                 {ind.codigo}
                               </span>
                               <Badge variant={isSelected ? "default" : "outline"} className="text-[10px]">{ind.peso_porcentaje}%</Badge>
                            </div>
                            <p className={cn("text-[11px] line-clamp-2", isSelected ? "text-primary font-bold" : "text-slate-500")}>
                              {ind.descripcion}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {setupStep === 1 && (
                <div className="space-y-12 w-full max-w-4xl flex flex-col items-center">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full">
                    {[
                      { id: 'manual', label: 'Nota Directa', icon: FileText },
                      { id: 'cotejo', label: 'Lista de Cotejo', icon: LayoutList },
                      { id: 'rubrica', label: 'Rúbrica', icon: Target },
                      { id: 'escala', label: 'Escala Valorativa', icon: Star },
                      { id: 'anecdotario', label: 'Guía Observación', icon: Quote }
                    ].map((t) => (
                      <Button key={t.id} variant="outline" className={cn("h-auto py-8 flex-col gap-4 rounded-3xl border-2 transition-all w-full", newInstType === t.id ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20' : 'hover:border-slate-200')} onClick={() => { setNewInstType(t.id as any); if(t.id === 'manual') setNewStrategyType('individual'); }}>
                        <t.icon className={`h-8 w-8 ${newInstType === t.id ? 'text-primary' : 'text-slate-300'}`} />
                        <span className="font-black text-[10px] uppercase text-center">{t.label}</span>
                      </Button>
                    ))}
                  </div>
                  {newInstType !== 'manual' && (
                    <div className="flex flex-wrap justify-center gap-4 w-full pt-8 border-t border-slate-50">
                      {[
                        { id: 'individual', label: 'Individual', icon: User, desc: 'Evaluación personalizada.' },
                        { id: 'grupal', label: 'Equipos', icon: Users, desc: 'Trabajo colaborativo.' },
                        { id: 'quizz', label: 'Gamificación', icon: Gamepad2, desc: 'Desafío en tiempo real.' }
                      ].map((s) => (
                        <Button key={s.id} variant="outline" className={cn("h-auto p-6 flex-col gap-3 rounded-[2rem] border-2 text-left items-start transition-all w-full max-w-[280px]", newStrategyType === s.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-slate-200')} onClick={() => setNewStrategyType(s.id as any)}>
                          <div className="flex justify-between items-center w-full"><s.icon className={`h-8 w-8 ${newStrategyType === s.id ? 'text-primary' : 'text-slate-300'}`} />{newStrategyType === s.id && <CheckCircle2 className="h-5 w-5 text-primary" />}</div>
                          <p className="font-black text-[11px] uppercase">{s.label}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{s.desc}</p>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {setupStep === 2 && (
                <div className="space-y-10 w-full max-w-2xl bg-slate-50 p-10 rounded-[3rem] border-2 border-slate-100">
                  <div className="space-y-3">
                    <Label className="font-black text-slate-500 text-sm uppercase tracking-[0.2em] ml-1">Nombre de la Actividad</Label>
                    <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Ej. Exposición de Proyectos" className="h-16 rounded-2xl text-xl font-bold border-none shadow-inner bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="font-black text-slate-500 text-sm uppercase tracking-[0.2em] ml-1">Peso %</Label>
                      <Input type="number" value={newInstrumentWeight || ""} onChange={e => setNewInstrumentWeight(parseInt(e.target.value) || 0)} className="h-16 rounded-2xl text-center text-xl font-black border-none shadow-inner bg-white" />
                    </div>
                    <div className="space-y-3">
                      <Label className="font-black text-slate-500 text-sm uppercase tracking-[0.2em] ml-1">Puntaje Máximo</Label>
                      <Input type="number" value={newMaxPoints} onChange={e => setNewMaxPoints(parseInt(e.target.value) || 20)} disabled={newInstType !== 'manual'} className="h-16 rounded-2xl text-center text-xl font-black border-none shadow-inner bg-white" />
                    </div>
                  </div>
                  {newInstType !== 'manual' && (
                    <div className="pt-8 border-t border-slate-200 flex flex-col items-center space-y-4">
                       <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAiScan} />
                       <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="h-14 px-10 gap-3 rounded-2xl border-2 border-dashed border-accent text-accent hover:bg-accent hover:text-white font-black uppercase text-[10px] tracking-widest shadow-sm">
                          {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Digitalizar con IA
                       </Button>
                    </div>
                  )}
                </div>
              )}

              {setupStep === 3 && (
                <div className="space-y-8 w-full max-w-4xl">
                  {newInstType === 'cotejo' && <ChecklistConfig criteria={editorCriteria} setCriteria={setEditorCriteria} />}
                  {newInstType === 'rubrica' && <RubricConfig criteria={editorCriteria} setCriteria={setEditorCriteria} />}
                  {newInstType === 'escala' && <ScaleConfig criteria={editorCriteria} setCriteria={setEditorCriteria} />}
                  {newInstType === 'anecdotario' && <GuideConfig criteria={editorCriteria} setCriteria={setEditorCriteria} />}
                </div>
              )}

              {setupStep === 4 && <GroupConfig students={students} groupSize={groupSize} setGroupSize={setGroupSize} studentGroups={studentGroups} setStudentGroups={setStudentGroups} newColName={newColName} />}

              {setupStep === 5 && (
                <div className="space-y-8 w-full max-w-4xl">
                  <div className="flex flex-col md:flex-row justify-between items-center bg-white p-10 rounded-[3rem] border-2 border-slate-100 gap-8 shadow-sm">
                    <div className="flex items-center gap-6">
                      <div className="p-5 bg-accent rounded-3xl shadow-xl text-white"><Gamepad2 className="h-10 w-10" /></div>
                      <div>
                        <Badge variant="outline" className="border-accent/20 text-accent font-black uppercase text-[8px] tracking-widest mb-1">Gamificación con IA</Badge>
                        <div className="font-black text-3xl tracking-tighter uppercase italic text-slate-900">{newColName}</div>
                      </div>
                    </div>
                    <Button 
                      onClick={handleGenerateQuizQuestions} 
                      disabled={isGeneratingQuiz} 
                      className="bg-accent hover:bg-accent/90 h-16 px-10 rounded-2xl font-black uppercase text-xs tracking-widest gap-3 shadow-xl shadow-accent/20 text-white transition-all"
                    >
                      {isGeneratingQuiz ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generar Banco de Preguntas
                    </Button>
                  </div>
                  
                  <div className="bg-slate-50/50 p-6 rounded-[2.5rem] border-2 border-slate-100">
                    <QuestionEditor questions={quizQuestions} onUpdate={setQuizQuestions} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="h-24 px-10 bg-slate-50 border-t flex items-center justify-between shrink-0">
          <Button variant="ghost" onClick={handleBack} disabled={setupStep === 0 || isScanning || isFinishing} className="font-black text-[10px] uppercase h-12 px-8 rounded-xl border-2">Atrás</Button>
          <Button className="bg-primary px-10 h-12 font-black text-[10px] uppercase rounded-xl text-white shadow-lg min-w-[140px]" onClick={handleNext} disabled={isScanning || isFinishing}>
            {isFinishing ? <Loader2 className="h-4 w-4 animate-spin" /> : (setupStep === 5 ? "Finalizar Registro" : setupStep === 3 && newStrategyType === 'individual' ? "Finalizar" : "Continuar")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
