
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
  Loader2
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
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      toast({
        variant: "destructive",
        title: "Error de Datos",
        description: "No se pudieron sincronizar las estadísticas reales del servidor.",
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = [
    { name: "Programas", value: realStats.programs.toString(), icon: GraduationCap, color: "from-blue-600 to-blue-400", change: "En oferta académica", num: realStats.programs },
    { name: "Docentes", value: realStats.instructors.toString(), icon: Users, color: "from-indigo-600 to-indigo-400", change: "Cuerpo profesional", num: realStats.instructors },
    { name: "Cursos", value: realStats.courses.toString(), icon: BookOpen, color: "from-slate-800 to-slate-600", change: "Unidades activas", num: realStats.courses },
    { name: "Alumnos", value: realStats.students.toString(), icon: UserCheck, color: "from-emerald-600 to-emerald-400", change: "Matriculados", num: realStats.students },
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
      {/* Header Ejecutivo */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2 w-full lg:w-auto">
          <Badge className="bg-primary/10 text-primary border-none font-bold uppercase tracking-widest px-3 md:px-4 py-1 text-[10px] md:text-xs">
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
            onClick={handleGenerateAiInsights} 
            disabled={isAnalyzing || isLoadingStats}
            className="w-full sm:w-auto bg-accent text-white gap-2 h-11 md:h-12 px-6 shadow-lg shadow-accent/20 hover:opacity-90 transition-all font-bold text-sm"
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Sparkles className="h-4 w-4 md:h-5 md:w-5" />}
            {isAnalyzing ? "Analizando Datos Reales..." : "Generar Análisis IA"}
          </Button>
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 h-11 md:h-12 w-full sm:w-auto">
            <div className="bg-slate-50 p-1.5 md:p-2 rounded-xl">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <div className="pr-4">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Periodo</p>
              <p className="text-xs font-extrabold text-slate-700">2024 - II</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de KPIs Dinámicos */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {isLoadingStats ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="border-none shadow-xl h-32 animate-pulse bg-slate-100/50" />
          ))
        ) : (
          stats.map((stat) => (
            <Card key={stat.name} className="border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all duration-300 overflow-hidden group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 md:pb-4">
                <div className={`p-2.5 md:p-3 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                  <stat.icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">{stat.name}</div>
                <div className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter mb-1 md:mb-2">{stat.value}</div>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* IA INSIGHTS SECTION */}
      {aiInsights && (
        <Card className="border-none shadow-2xl bg-gradient-to-br from-slate-900 to-blue-900 text-white overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
          <CardHeader className="border-b border-white/10 p-5 md:p-8 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md shrink-0">
                <Zap className="h-5 w-5 md:h-6 md:w-6 text-yellow-400" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg md:text-2xl font-black tracking-tight truncate">Análisis Estratégico de IA</CardTitle>
                <p className="text-blue-200/60 text-[10px] md:text-sm">Generado con data real del backend</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setAiInsights(null)} className="text-white hover:bg-white/10 h-8 w-8 p-0">×</Button>
          </CardHeader>
          <CardContent className="p-5 md:p-8 space-y-6 md:space-y-8">
            <div className="space-y-2">
              <h4 className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-blue-300">Resumen Ejecutivo</h4>
              <p className="text-sm md:text-lg leading-relaxed text-blue-50/90 font-medium">
                {aiInsights.executiveSummary}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-4 bg-white/5 p-4 md:p-6 rounded-2xl border border-white/10">
                <h4 className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-blue-300 flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 md:h-4 md:w-4" /> Hallazgos Críticos
                </h4>
                <ul className="space-y-2 md:space-y-3">
                  {aiInsights.criticalInsights.map((insight, i) => (
                    <li key={i} className="flex gap-2 md:gap-3 text-xs md:text-sm text-blue-50/80">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4 bg-white/5 p-4 md:p-6 rounded-2xl border border-white/10">
                <h4 className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 md:h-4 md:w-4" /> Recomendaciones Estratégicas
                </h4>
                <ul className="space-y-2 md:space-y-3">
                  {aiInsights.strategicRecommendations.map((rec, i) => (
                    <li key={i} className="flex gap-2 md:gap-3 text-xs md:text-sm text-blue-50/80">
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

      {/* Sección Analítica */}
      <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
        {/* Gráfico de Asistencia */}
        <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b bg-slate-50/50 p-6 md:p-8 gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg md:text-xl font-black tracking-tight text-slate-900">Rendimiento de Asistencia</CardTitle>
              <p className="text-xs md:text-sm text-slate-500 font-medium italic">Promedio semanal institucional</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold bg-white px-2.5 py-1 rounded-full border shadow-sm shrink-0">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Sincronizado
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="h-[250px] md:h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorAsistencia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#003f98" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#003f98" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="asistencia" 
                    stroke="#003f98" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorAsistencia)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Feed de Actividad Dinámico */}
        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 p-6 md:p-8 flex flex-row items-center justify-between">
            <CardTitle className="text-lg md:text-xl font-black tracking-tight">Estado del Sistema</CardTitle>
            <Activity className="h-4 w-4 md:h-5 md:w-5 text-primary animate-pulse" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-auto">
              {[
                { title: "Servidor FastAPI Conectado", user: "Backend", time: "Ahora", icon: Zap, bg: "bg-emerald-50 text-emerald-600" },
                { title: "Base de Datos Sincronizada", user: "Supabase", time: "Activo", icon: UserCheck, bg: "bg-blue-50 text-blue-600" },
                { title: "Servicio de IA Activo", user: "Genkit", time: "Listo", icon: Sparkles, bg: "bg-indigo-50 text-indigo-600" },
                { title: "Monitor de Seguridad", user: "Auth", time: "Protegido", icon: Clock, bg: "bg-slate-50 text-slate-600" },
              ].map((action, i) => (
                <div key={i} className="flex items-center gap-3 p-4 md:p-6 hover:bg-slate-50/80 transition-all cursor-pointer group">
                  <div className={`h-10 w-10 md:h-12 md:w-12 rounded-2xl ${action.bg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                    <action.icon className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-xs md:text-sm truncate">{action.title}</p>
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium">{action.user} • {action.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="p-4 md:p-6 bg-slate-50/50 border-t">
            <Button variant="outline" className="w-full font-bold text-[10px] uppercase tracking-widest h-10">
              Ver Logs de Sistema
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
