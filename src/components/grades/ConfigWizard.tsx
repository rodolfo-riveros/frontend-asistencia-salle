
"use client"

import * as React from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogTitle 
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
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ChecklistConfig } from "./editor/ChecklistConfig"
import { RubricConfig } from "./editor/RubricConfig"
import { ScaleConfig } from "./editor/ScaleConfig"
import { GuideConfig } from "./editor/GuideConfig"
import { GroupConfig } from "./strategies/GroupConfig"

import { api } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { analyzeInstrument } from "@/ai/flows/analyze-instrument-flow"

const INST_LABELS: Record<string, string> = {
  manual: 'Nota Directa',
  cotejo: 'Lista de Cotejo',
  rubrica: 'Rúbrica',
  escala: 'Escala Valorativa',
  guia: 'Guía Observación'
}

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
  newInstType: 'manual' | 'cotejo' | 'rubrica' | 'escala' | 'guia'
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
  isScanning: boolean
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
  editorCriteria, setEditorCriteria, isScanning: parentIsScanning, fileInputRef, totalPointsStep,
  students, groupSize, setGroupSize, studentGroups, setStudentGroups, addColumn, resetEditor
}: ConfigWizardProps) {
  
  const [isFinishing, setIsFinishing] = React.useState(false)
  const [isScanning, setIsScanning] = React.useState(false)
  const [evalIdCreated, setEvalIdCreated] = React.useState<string | null>(null)

  const handleAiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsScanning(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      const analysis = await analyzeInstrument({ photoDataUri: base64 })
      if (!analysis) throw new Error("La IA no pudo interpretar el documento.")
      
      if (analysis.type) setNewInstType(analysis.type)
      if (analysis.name) setNewColName(analysis.name)
      if (analysis.suggestedWeight) setNewInstrumentWeight(analysis.suggestedWeight)
      
      if ((analysis.type === 'cotejo' || analysis.type === 'guia') && analysis.checklistCriteria) {
        setEditorCriteria(analysis.checklistCriteria.map((c: any) => ({ id: Math.random().toString(), ...c })))
      } else if (analysis.type === 'rubrica' && analysis.rubricDimensions) {
        setEditorCriteria(analysis.rubricDimensions.map((d: any) => ({ id: Math.random().toString(), ...d })))
      } else if (analysis.type === 'escala' && analysis.checklistCriteria) {
        setEditorCriteria(analysis.checklistCriteria.map((c: any) => ({ id: Math.random().toString(), description: c.description })))
      }
      
      setSetupStep(3) 
      toast({ title: "Digitalización Exitosa" })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setIsScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = "" 
    }
  }

  const handleFinish = async () => {
    if (isFinishing) return
    setIsFinishing(true)
    
    // Si la estrategia es Gamificación, el tipo debe ser QUIZZ para el backend
    const finalType = newStrategyType === 'quizz' ? 'quizz' : newInstType;

    const payload = {
      unidad_id: unidadId,
      periodo_id: periodoId,
      indicador_codigo: newIndicatorCode,
      indicador_desc: newIndicatorDescription,
      indicador_peso: newIndicatorWeight,
      nombre: newColName,
      tipo: finalType,
      peso_instrumento: newInstrumentWeight,
      puntaje_maximo: newMaxPoints,
      configuracion_json: {
        criteria: editorCriteria,
        strategy: newStrategyType
      }
    }

    try {
      // El backend devuelve { indicador: IndicadorOut, evaluacion: EvaluacionOut }
      const response = await api.post<any>('/evaluaciones/config/', payload);
      const evalId = response.evaluacion.id;
      setEvalIdCreated(evalId);
      
      if (newStrategyType === 'grupal') {
        setSetupStep(4);
      } else {
        toast({ title: "Evaluación Registrada", description: "La actividad ha sido guardada en el servidor." });
        addColumn();
        setIsOpen(false);
        resetEditor();
      }
    } catch (err: any) {
      if (err.message.includes('409')) {
        toast({ 
          variant: "destructive", 
          title: "Conflicto de Datos", 
          description: "Ya existe una actividad con este nombre para el indicador seleccionado." 
        });
      } else {
        toast({ variant: "destructive", title: "Error", description: err.message || "Fallo en la sincronización con el servidor." });
      }
    } finally {
      setIsFinishing(false)
    }
  }

  const handleSaveGroups = async () => {
    if (!evalIdCreated || isFinishing) return;
    setIsFinishing(true);

    const groupsMap: Record<string, string[]> = {};
    Object.entries(studentGroups).forEach(([studentId, groupName]) => {
      if (!groupsMap[groupName]) groupsMap[groupName] = [];
      groupsMap[groupName].push(studentId);
    });

    const payload = {
      evaluacion_id: evalIdCreated,
      grupos: Object.entries(groupsMap).map(([name, ids]) => ({
        nombre_group: name,
        integrantes: ids
      }))
    };

    try {
      await api.post('/evaluaciones/grupos/', payload);
      toast({ title: "Equipos Guardados", description: "La conformación de grupos ha sido registrada." });
      addColumn();
      setIsOpen(false);
      resetEditor();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error de Grupos", description: "No se pudieron guardar los equipos." });
    } finally {
      setIsFinishing(false);
    }
  }

  const handleNext = () => {
    if (setupStep === 1 && newInstType === 'manual') {
      setNewStrategyType('individual');
      setSetupStep(2);
      return;
    }
    
    const isReadyToSave = (
      (setupStep === 2 && newInstType === 'manual') || 
      (setupStep === 2 && newInstType !== 'manual' && newStrategyType === 'individual') ||
      (setupStep === 3)
    );

    if (isReadyToSave) {
      handleFinish();
    } else if (setupStep === 4) {
      handleSaveGroups();
    } else {
      setSetupStep(setupStep + 1);
    }
  }

  const handleBack = () => {
    if (setupStep === 2 && newInstType === 'manual') setSetupStep(1);
    else setSetupStep(Math.max(0, setupStep - 1));
  }

  const getInstrumentIcon = (type: string) => {
    switch (type) {
      case 'cotejo': return <LayoutList className="h-6 w-6" />;
      case 'rubrica': return <Target className="h-6 w-6" />;
      case 'escala': return <Star className="h-6 w-6" />;
      case 'guia': return <Quote className="h-6 w-6" />;
      default: return <FileText className="h-6 w-6" />;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if(!isFinishing) { setIsOpen(o); if(!o) resetEditor(); } }}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl flex flex-col h-[90vh]">
        <div className="bg-primary h-28 flex flex-col justify-center px-10 text-white shrink-0">
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">Registro de Evaluación Técnica</DialogTitle>
          <DialogDescription className="text-blue-100/80 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
            PASO {setupStep + 1}: {
              setupStep === 0 ? "Indicador de Logro" :
              setupStep === 1 ? (newInstType === 'manual' ? "Instrumento de Evaluación" : "Instrumento y Estrategia") :
              setupStep === 2 ? "Detalles de Actividad" :
              setupStep === 3 ? "Diseño Pedagógico" : "Sorteo de Equipos"
            }
          </DialogDescription>
        </div>

        <div className="flex-grow overflow-hidden flex flex-col bg-white">
          <ScrollArea className="flex-grow">
            <div className="p-10 flex flex-col items-center">
              {setupStep === 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 w-full max-w-4xl">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Indicador de Logro</h4>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Criterio Curricular</p>
                      </div>
                    </div>
                    <div className="bg-slate-50/50 p-8 rounded-[2rem] border-2 border-slate-100 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] ml-1">Código ILC</Label>
                          <Input value={newIndicatorCode} onChange={e => setNewIndicatorCode(e.target.value.toUpperCase())} placeholder="Ej: C1.I1" className="h-12 border-none shadow-inner rounded-xl font-black text-lg bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] ml-1">Peso (%)</Label>
                          <Input type="number" value={newIndicatorWeight || ""} onChange={e => setNewIndicatorWeight(parseInt(e.target.value) || 0)} className="h-12 border-none shadow-inner rounded-xl font-black text-center text-lg bg-white" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] ml-1">Descripción del Indicador</Label>
                        <Textarea value={newIndicatorDescription} onChange={e => setNewIndicatorDescription(e.target.value)} placeholder="Logro esperado..." className="h-24 border-none shadow-inner rounded-2xl bg-white resize-none" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary"><History className="h-6 w-6" /></div>
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Biblioteca</h4>
                      </div>
                    </div>
                    <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-6 min-h-[250px]">
                      {existingIndicators.length > 0 ? (
                        existingIndicators.map((ind: any, i: number) => (
                          <button key={i} className="flex flex-col items-start p-4 rounded-2xl border-2 border-slate-50 hover:border-primary/30 hover:bg-primary/5 mb-3 w-full text-left transition-all" onClick={() => { setNewIndicatorCode(ind.code); setNewIndicatorDescription(ind.desc); setNewIndicatorWeight(ind.weight); }}>
                            <div className="flex justify-between w-full font-black text-sm text-primary mb-1"><span>{ind.code}</span><Badge variant="outline" className="text-[10px]">{ind.weight}%</Badge></div>
                            <p className="text-[11px] text-slate-500 line-clamp-2">{ind.desc}</p>
                          </button>
                        ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 py-20"><p className="text-center font-bold uppercase text-[10px] tracking-widest">No hay indicadores previos</p></div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {setupStep === 1 && (
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 w-full max-w-4xl flex flex-col items-center">
                  <div className="space-y-8 w-full">
                    <div className="flex items-center justify-center gap-3"><div className="h-2 w-2 rounded-full bg-primary" /><h4 className="font-black text-[10px] uppercase text-primary tracking-[0.2em]">Instrumento de Evaluación</h4><div className="h-2 w-2 rounded-full bg-primary" /></div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {[
                        { id: 'manual', label: 'Nota Directa', icon: FileText },
                        { id: 'cotejo', label: 'Lista de Cotejo', icon: LayoutList },
                        { id: 'rubrica', label: 'Rúbrica', icon: Target },
                        { id: 'escala', label: 'Escala Valorativa', icon: Star },
                        { id: 'guia', label: 'Guía Observación', icon: Quote }
                      ].map((t) => (
                        <Button key={t.id} variant="outline" className={cn("h-auto py-8 flex-col gap-4 rounded-3xl border-2 transition-all w-full", newInstType === t.id ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20' : 'hover:border-slate-200')} onClick={() => { setNewInstType(t.id as any); if(t.id === 'manual') setNewStrategyType('individual'); }}>
                          <t.icon className={`h-8 w-8 ${newInstType === t.id ? 'text-primary' : 'text-slate-300'}`} />
                          <span className="font-black text-[10px] uppercase tracking-tighter text-center">{t.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                  {newInstType !== 'manual' && (
                    <div className="space-y-8 pt-6 border-t border-slate-50 w-full flex flex-col items-center">
                      <div className="flex items-center justify-center gap-3"><div className="h-2 w-2 rounded-full bg-primary" /><h4 className="font-black text-[10px] uppercase text-primary tracking-[0.2em]">Define la Estrategia</h4><div className="h-2 w-2 rounded-full bg-primary" /></div>
                      <div className="flex flex-wrap justify-center gap-4 w-full">
                        {[
                          { id: 'individual', label: 'Evaluación Individual', icon: User, desc: 'Calificación personalizada.' },
                          { id: 'grupal', label: 'Evaluación Grupal', icon: Users, desc: 'Trabajo colaborativo.' },
                          { id: 'quizz', label: 'Gamificación', icon: Gamepad2, desc: 'Evaluación interactiva vía IA.' }
                        ].map((s) => (
                          <Button key={s.id} variant="outline" className={cn("h-auto p-6 flex-col gap-3 rounded-[2rem] border-2 text-left items-start transition-all w-full max-w-[280px]", newStrategyType === s.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-slate-200')} onClick={() => setNewStrategyType(s.id as any)}>
                            <div className="flex justify-between items-center w-full"><s.icon className={`h-8 w-8 ${newStrategyType === s.id ? 'text-primary' : 'text-slate-300'}`} />{newStrategyType === s.id && <CheckCircle2 className="h-5 w-5 text-primary" />}</div>
                            <p className="font-black text-[11px] uppercase tracking-tighter">{s.label}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{s.desc}</p>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {setupStep === 2 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 w-full max-w-2xl">
                  <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-slate-100 space-y-8">
                    <div className="space-y-3">
                      <Label className="font-black text-slate-500 text-sm uppercase tracking-[0.2em] ml-1">Nombre de la Actividad</Label>
                      <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Ej. Exposición de Proyectos" className="h-16 rounded-2xl text-xl font-bold border-none shadow-inner bg-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="font-black text-slate-500 text-sm uppercase tracking-[0.2em] ml-1">Peso (%)</Label>
                        <Input type="number" value={newInstrumentWeight || ""} onChange={e => setNewInstrumentWeight(parseInt(e.target.value) || 0)} className="h-16 rounded-2xl text-center text-xl font-black border-none shadow-inner bg-white" />
                      </div>
                      <div className="space-y-3">
                        <Label className="font-black text-slate-500 text-sm uppercase tracking-[0.2em] ml-1">Puntaje Máximo</Label>
                        <Input type="number" value={newMaxPoints} onChange={e => setNewMaxPoints(parseInt(e.target.value) || 20)} disabled={newInstType !== 'manual'} className="h-16 rounded-2xl text-center text-xl font-black border-none shadow-inner bg-white" />
                      </div>
                    </div>
                    {newInstType !== 'manual' && (
                      <div className="pt-8 border-t border-slate-200 flex flex-col items-center space-y-4">
                         <div className="text-center space-y-1"><h5 className="font-black text-[10px] uppercase text-slate-800 tracking-widest">Digitalizador con IA</h5><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Escanea instrumentos físicos</p></div>
                         <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAiScan} />
                         <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="h-14 px-10 gap-3 rounded-2xl border-2 border-dashed border-accent text-accent hover:bg-accent hover:text-white font-black uppercase text-[10px] tracking-widest shadow-sm">
                            {isScanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-4 w-4" />} {isScanning ? "Escaneando..." : "Digitalizar con IA"}
                         </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {setupStep === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 w-full max-w-4xl">
                  <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 gap-6">
                    <div className="flex items-center gap-6"><div className="p-5 bg-primary text-white rounded-3xl shadow-xl">{getInstrumentIcon(newInstType)}</div><div><Badge variant="outline" className="font-black text-[8px] uppercase tracking-widest border-primary/20 text-primary mb-1">{INST_LABELS[newInstType].toUpperCase()}</Badge><div className="font-black text-slate-900 text-3xl tracking-tighter uppercase">{newColName || "Actividad"}</div></div></div>
                    {(newInstType === 'cotejo' || newInstType === 'guia') && <div className={cn("px-8 py-4 rounded-2xl font-black text-xl shadow-inner border-2", totalPointsStep === 20 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100')}>{totalPointsStep} / 20 PTS</div>}
                  </div>
                  {newInstType === 'cotejo' && <ChecklistConfig criteria={editorCriteria} setCriteria={setEditorCriteria} />}
                  {newInstType === 'rubrica' && <RubricConfig criteria={editorCriteria} setCriteria={setEditorCriteria} />}
                  {newInstType === 'escala' && <ScaleConfig criteria={editorCriteria} setCriteria={setEditorCriteria} />}
                  {newInstType === 'guia' && <GuideConfig criteria={editorCriteria} setCriteria={setEditorCriteria} />}
                </div>
              )}

              {setupStep === 4 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 w-full max-w-4xl">
                  <div className="flex items-center gap-6 bg-primary p-8 rounded-[2.5rem] text-white shadow-xl"><div className="p-5 bg-white/20 rounded-3xl backdrop-blur-md border border-white/10"><Users className="h-8 w-8" /></div><div><Badge className="bg-white/20 text-white border-none font-black uppercase text-[8px] tracking-widest mb-1">Estrategia Grupal</Badge><div className="font-black text-3xl tracking-tighter uppercase">{newColName || "Trabajo en Equipo"}</div></div></div>
                  <GroupConfig students={students} groupSize={groupSize} setGroupSize={setGroupSize} studentGroups={studentGroups} setStudentGroups={setStudentGroups} newColName={newColName} />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="h-24 px-10 bg-slate-50 border-t flex items-center justify-between shrink-0">
          <Button variant="ghost" onClick={handleBack} disabled={setupStep === 0 || isScanning || isFinishing} className="font-black text-[10px] uppercase h-12 px-8 rounded-xl border-2">Anterior</Button>
          <Button className="bg-primary px-10 h-12 font-black text-[10px] uppercase rounded-xl text-white shadow-lg min-w-[140px]" onClick={handleNext} disabled={(setupStep === 0 && (!newIndicatorCode || !newIndicatorDescription)) || (setupStep === 2 && !newColName) || isScanning || isFinishing}>
            {isFinishing ? <Loader2 className="h-4 w-4 animate-spin" /> : (setupStep === 4 || (setupStep === 2 && newInstType === 'manual') || (setupStep === 2 && newInstType !== 'manual' && newStrategyType === 'individual') || (setupStep === 3) ? "Finalizar y Guardar" : "Siguiente")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
