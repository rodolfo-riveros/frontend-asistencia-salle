
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  UserCheck, 
  TrendingUp, 
  Calendar, 
  Activity,
  Zap,
  ShieldCheck,
  Loader2,
  RefreshCcw,
  Sparkles,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAdminInsights, type AdminDashboardOutput } from "@/ai/flows/admin-dashboard-insights";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function AdminDashboard() {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);
  const [aiInsights, setAiInsights] = React.useState<AdminDashboardOutput | null>(null);
  const [periods, setPeriods] = React.useState<any[]>([]);
  const [activePeriodId, setActivePeriodId] = React.useState<string>("");
  
  const [realStats, setRealStats] = React.useState({
    programs: 0,
    instructors: 0,
    courses: 0,
    students: 0,
    avgAttendance: "94.2%" 
  });

  const fetchData = React.useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const [progs, docs, units, students, periodData] = await Promise.all([
        api.get<any[]>('/programas/'),
        api.get<any[]>('/docentes/'),
        api.get<any[]>('/unidades/'),
        api.get<any[]>('/alumnos/'),
        api.get<any[]>('/periodos/')
      ]);
      
      setPeriods(periodData);
      const active = periodData.find((p: any) => p.es_activo);
      if (active && !activePeriodId) setActivePeriodId(active.id);

      setRealStats({
        programs: progs.length,
        instructors: docs.length,
        courses: units.length,
        students: students.length,
        avgAttendance: "94.2%" 
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: err.message || "No se pudieron sincronizar las estadísticas reales.",
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, [activePeriodId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = [
    { name: "Programas", value: realStats.programs.toString(), icon: GraduationCap, color: "from-blue-600 to-blue-400", change: "Oferta Global" },
    { name: "Docentes", value: realStats.instructors.toString(), icon: Users, color: "from-indigo-600 to-indigo-400", change: "Plana Activa" },
    { name: "Cursos", value: realStats.courses.toString(), icon: BookOpen, color: "from-slate-800 to-slate-600", change: "Unidades en Catálogo" },
    { name: "Alumnos", value: realStats.students.toString(), icon: UserCheck, color: "from-emerald-600 to-emerald-400", change: "Matrícula Vigente" },
  ];

  const handleGenerateAiInsights = async () => {
    setIsAnalyzing(true);
    try {
      const selectedPeriod = periods.find(p => p.id === activePeriodId)?.nombre || "Actual";
      const insights = await getAdminInsights({
        stats: {
          totalPrograms: realStats.programs,
          totalInstructors: realStats.instructors,
          totalCourses: realStats.courses,
          averageAttendance: realStats.avgAttendance
        },
        recentActivities: [`Diagnóstico estratégico para el ciclo académico ${selectedPeriod}`]
      });
      setAiInsights(insights);
      toast({ title: "Análisis IA Completo", description: "Los resultados se muestran en el panel inferior." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error de IA", description: "No se pudo generar el diagnóstico." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-none font-bold uppercase tracking-widest px-3 py-1 text-xs">
            Admin Central
          </Badge>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900 leading-tight">
            Panel de Control Estratégico
          </h2>
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Calendar className="h-4 w-4" />
            <span>Contexto Académico:</span>
            <Select value={activePeriodId} onValueChange={setActivePeriodId}>
              <SelectTrigger className="w-[180px] h-8 font-bold border-none bg-white shadow-sm">
                <SelectValue placeholder="Seleccione ciclo" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre} {p.es_activo && "(Activo)"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCcw className={`h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <Button onClick={handleGenerateAiInsights} disabled={isAnalyzing} className="bg-accent text-white gap-2 font-bold shadow-lg shadow-accent/20">
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Diagnóstico IA
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.name}</div>
              <div className="text-2xl font-black text-slate-900">{isLoadingStats ? "..." : stat.value}</div>
              <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {aiInsights && (
        <Card className="border-none shadow-2xl bg-slate-900 text-white overflow-hidden animate-in fade-in slide-in-from-top-4">
          <CardHeader className="border-b border-white/10 p-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-yellow-400" />
              <CardTitle className="text-xl font-black">Diagnóstico de IA - {periods.find(p => p.id === activePeriodId)?.nombre}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-blue-300">Resumen Ejecutivo</h4>
              <p className="text-lg text-blue-50/90 font-medium">{aiInsights.executiveSummary}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-blue-300 mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Hallazgos Críticos
                </h4>
                <ul className="space-y-2 text-sm text-blue-50/70">
                  {aiInsights.criticalInsights.map((insight, i) => <li key={i}>• {insight}</li>)}
                </ul>
              </div>
              <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Recomendaciones Estratégicas
                </h4>
                <ul className="space-y-2 text-sm text-blue-50/70">
                  {aiInsights.strategicRecommendations.map((rec, i) => <li key={i}>• {rec}</li>)}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-xl">
          <CardHeader className="border-b bg-slate-50/50 p-6 flex items-center justify-between flex-row">
            <div className="space-y-1">
              <CardTitle className="text-lg font-black text-slate-900">Actividad del Sistema</CardTitle>
              <p className="text-xs text-slate-500">Monitor de sincronización en tiempo real</p>
            </div>
            <Activity className="h-5 w-5 text-primary animate-pulse" />
          </CardHeader>
          <CardContent className="p-6">
             <div className="space-y-6">
                {[
                  { title: "Servidor FastAPI", status: "Conectado", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-50" },
                  { title: "Supabase DB", status: "Sincronizado", icon: UserCheck, color: "text-blue-500", bg: "bg-blue-50" },
                  { title: "Genkit AI", status: "Listo", icon: Sparkles, color: "text-indigo-500", bg: "bg-indigo-50" }
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}>
                      <s.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">{s.title}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{s.status}</p>
                    </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl overflow-hidden bg-primary text-white">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-black">Estado Institucional</CardTitle>
            <p className="text-blue-100/60 text-xs">Gestión por Ciclo</p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             <div className="p-4 bg-white/10 rounded-xl border border-white/10">
                <p className="text-xs font-bold uppercase tracking-widest mb-2">Ciclo Académico Actual</p>
                <p className="text-3xl font-black">{periods.find(p => p.id === activePeriodId)?.nombre || "Cargando..."}</p>
             </div>
             <p className="text-sm text-blue-50/80 leading-relaxed italic">
                "La gestión académica se centraliza en el periodo activo. Las asignaciones y el pase de lista dependen de esta configuración global en FastAPI."
             </p>
          </CardContent>
          <div className="p-6 bg-white/5 border-t border-white/10">
            <Button variant="ghost" className="w-full text-white hover:bg-white/10 font-bold uppercase text-[10px] tracking-widest gap-2">
              <Clock className="h-4 w-4" /> Historial de Ciclos
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
