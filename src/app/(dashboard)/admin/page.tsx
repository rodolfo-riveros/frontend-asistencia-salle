
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  FileCheck, 
  TrendingUp, 
  Calendar, 
  ArrowUpRight,
  Activity,
  UserCheck,
  Clock,
  Sparkles,
  Zap,
  ShieldCheck,
  Loader2,
  RefreshCcw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from "recharts";
import { getAdminInsights, type AdminDashboardOutput } from "@/ai/flows/admin-dashboard-insights";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const data = [
  { name: 'Lun', asistencia: 92 },
  { name: 'Mar', asistencia: 88 },
  { name: 'Mie', asistencia: 95 },
  { name: 'Jue', asistencia: 94 },
  { name: 'Vie', asistencia: 90 },
];

export default function AdminDashboard() {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);
  const [aiInsights, setAiInsights] = React.useState<AdminDashboardOutput | null>(null);
  
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
      const [progs, docs, units, students] = await Promise.all([
        api.get<any[]>('/programas/'),
        api.get<any[]>('/docentes/'),
        api.get<any[]>('/unidades/'),
        api.get<any[]>('/alumnos/')
      ]);
      
      setRealStats({
        programs: progs.length,
        instructors: docs.length,
        courses: units.length,
        students: students.length,
        avgAttendance: "94.2%" 
      });
    } catch (err: any) {
      console.error("Error fetching dashboard stats:", err);
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: err.message || "No se pudieron sincronizar las estadísticas reales.",
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = [
    { name: "Programas", value: realStats.programs.toString(), icon: GraduationCap, color: "from-blue-600 to-blue-400", change: "En oferta académica" },
    { name: "Docentes", value: realStats.instructors.toString(), icon: Users, color: "from-indigo-600 to-indigo-400", change: "Cuerpo profesional" },
    { name: "Cursos", value: realStats.courses.toString(), icon: BookOpen, color: "from-slate-800 to-slate-600", change: "Unidades activas" },
    { name: "Alumnos", value: realStats.students.toString(), icon: UserCheck, color: "from-emerald-600 to-emerald-400", change: "Matriculados" },
  ];

  const recentActivities = [
    "Sincronización con base de datos completada",
    "Monitor de IA activo para análisis predictivo",
    "Actualización de carga académica detectada",
    "Sistema de asistencia en tiempo real operando"
  ];

  const handleGenerateAiInsights = async () => {
    setIsAnalyzing(true);
    try {
      const insights = await getAdminInsights({
        stats: {
          totalPrograms: realStats.programs,
          totalInstructors: realStats.instructors,
          totalCourses: realStats.courses,
          averageAttendance: realStats.avgAttendance
        },
        recentActivities: recentActivities
      });
      setAiInsights(insights);
      toast({
        title: "Análisis IA Completo",
        description: "Se han generado nuevos insights estratégicos basados en data real.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de IA",
        description: "No se pudo conectar con el motor de inteligencia artificial.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2 w-full lg:w-auto">
          <Badge className="bg-primary/10 text-primary border-none font-bold uppercase tracking-widest px-3 py-1 text-xs">
            Módulo de Administración Central
          </Badge>
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-slate-900 leading-tight">
            Panel de Control Estratégico
          </h2>
          <p className="text-slate-500 text-sm md:text-lg font-medium">
            Supervisión institucional del IES LA SALLE URUBAMBA
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full lg:w-auto">
          <Button 
            variant="outline"
            onClick={fetchData}
            disabled={isLoadingStats}
            className="w-full sm:w-auto gap-2 h-11 border-slate-200"
          >
            <RefreshCcw className={`h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <Button 
            onClick={handleGenerateAiInsights} 
            disabled={isAnalyzing || isLoadingStats}
            className="w-full sm:w-auto bg-accent text-white gap-2 h-11 md:h-12 px-6 shadow-lg shadow-accent/20 hover:opacity-90 transition-all font-bold text-sm"
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isAnalyzing ? "Analizando..." : "Generar Análisis IA"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.name}</div>
              <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter mb-1">
                {isLoadingStats ? "..." : stat.value}
              </div>
              <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {aiInsights && (
        <Card className="border-none shadow-2xl bg-slate-900 text-white overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
          <CardHeader className="border-b border-white/10 p-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
                <Zap className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Análisis Estratégico de IA</CardTitle>
                <p className="text-blue-200/60 text-xs">Diagnóstico institucional automático</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setAiInsights(null)} className="text-white hover:bg-white/10 h-8 w-8 p-0">×</Button>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-8">
            <div className="space-y-2">
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-300">Resumen Ejecutivo</h4>
              <p className="text-sm md:text-lg leading-relaxed text-blue-50/90 font-medium">
                {aiInsights.executiveSummary}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-300 flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Hallazgos Críticos
                </h4>
                <ul className="space-y-3">
                  {aiInsights.criticalInsights.map((insight, i) => (
                    <li key={i} className="flex gap-3 text-sm text-blue-50/80">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Recomendaciones
                </h4>
                <ul className="space-y-3">
                  {aiInsights.strategicRecommendations.map((rec, i) => (
                    <li key={i} className="flex gap-3 text-sm text-blue-50/80">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-6">
            <div className="space-y-1">
              <CardTitle className="text-lg font-black tracking-tight text-slate-900">Rendimiento de Asistencia</CardTitle>
              <p className="text-xs text-slate-500 font-medium italic">Promedio semanal institucional</p>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorAsistencia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#003f98" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#003f98" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="asistencia" stroke="#003f98" strokeWidth={3} fillOpacity={1} fill="url(#colorAsistencia)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 p-6 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-black tracking-tight">Estado del Sistema</CardTitle>
            <Activity className="h-5 w-5 text-primary animate-pulse" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {[
                { title: "Servidor FastAPI", user: "Backend", status: "Monitorizado", icon: Zap, bg: "bg-emerald-50 text-emerald-600" },
                { title: "Supabase DB", user: "Persistencia", status: "Sincronizado", icon: UserCheck, bg: "bg-blue-50 text-blue-600" },
                { title: "Genkit AI", user: "Motor", status: "Listo", icon: Sparkles, bg: "bg-indigo-50 text-indigo-600" },
                { title: "Seguridad Auth", user: "JWT", status: "Protegido", icon: Clock, bg: "bg-slate-50 text-slate-600" },
              ].map((action, i) => (
                <div key={i} className="flex items-center gap-3 p-5 hover:bg-slate-50/80 transition-all cursor-pointer group">
                  <div className={`h-11 w-11 rounded-2xl ${action.bg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{action.title}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{action.user} • {action.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="p-6 bg-slate-50/50 border-t">
            <Button variant="outline" className="w-full font-bold text-[10px] uppercase tracking-widest h-10" onClick={fetchData}>
              Reintentar Conexión
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
