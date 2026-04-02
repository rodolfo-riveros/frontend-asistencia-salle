
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
  MoreHorizontal,
  Activity,
  UserCheck,
  Clock,
  Sparkles,
  Zap,
  ShieldCheck
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

const data = [
  { name: 'Lun', asistencia: 92 },
  { name: 'Mar', asistencia: 88 },
  { name: 'Mie', asistencia: 95 },
  { name: 'Jue', asistencia: 94 },
  { name: 'Vie', asistencia: 90 },
];

export default function AdminDashboard() {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [aiInsights, setAiInsights] = React.useState<AdminDashboardOutput | null>(null);

  const stats = [
    { name: "Programas", value: "12", icon: GraduationCap, color: "from-blue-600 to-blue-400", change: "+2 este ciclo", num: 12 },
    { name: "Cuerpo Docente", value: "48", icon: Users, color: "from-indigo-600 to-indigo-400", change: "Todos activos", num: 48 },
    { name: "Cursos Activos", value: "156", icon: BookOpen, color: "from-slate-800 to-slate-600", change: "+12 nuevas unidades", num: 156 },
    { name: "Asistencia Promedio", value: "94.2%", icon: FileCheck, color: "from-emerald-600 to-emerald-400", change: "+1.5% vs mes ant.", num: 94.2 },
  ];

  const activities = [
    "Reporte de Asistencia Generado - IA Insights",
    "Cierre de Matrícula - Sistema",
    "Docente Registró Firma - C. Mendoza",
    "Nuevo Plan Académico - Admin",
    "Mantenimiento Sistema - IT Soporte"
  ];

  const handleGenerateAiInsights = async () => {
    setIsAnalyzing(true);
    try {
      const insights = await getAdminInsights({
        stats: {
          totalPrograms: 12,
          totalInstructors: 48,
          totalCourses: 156,
          averageAttendance: "94.2%"
        },
        recentActivities: activities
      });
      setAiInsights(insights);
      toast({
        title: "Análisis IA Completo",
        description: "Se han generado nuevos insights estratégicos para su gestión.",
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
    <div className="space-y-10">
      {/* Header Ejecutivo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-none font-bold uppercase tracking-widest px-4 py-1">
            Módulo de Administración Central
          </Badge>
          <h2 className="text-4xl font-headline font-extrabold tracking-tight text-slate-900 leading-tight">
            Panel de Control Estratégico
          </h2>
          <p className="text-slate-500 text-lg font-medium">
            Supervisión institucional del IES LA SALLE URUBAMBA
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <Button 
            onClick={handleGenerateAiInsights} 
            disabled={isAnalyzing}
            className="bg-accent text-white gap-2 h-12 px-6 shadow-lg shadow-accent/20 hover:opacity-90 transition-all font-bold"
          >
            <Sparkles className={`h-5 w-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? "Analizando Datos..." : "Generar Análisis IA"}
          </Button>
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 h-12">
            <div className="bg-slate-50 p-2 rounded-xl">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="pr-4">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Periodo</p>
              <p className="text-xs font-extrabold text-slate-700">2024 - II</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.name}</div>
              <div className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{stat.value}</div>
              <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* IA INSIGHTS SECTION */}
      {aiInsights && (
        <Card className="border-none shadow-2xl bg-gradient-to-br from-slate-900 to-blue-900 text-white overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
          <CardHeader className="border-b border-white/10 p-8 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
                <Zap className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black tracking-tight">Análisis Estratégico de IA</CardTitle>
                <p className="text-blue-200/60 text-sm">Generado en tiempo real por Precision IA</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setAiInsights(null)} className="text-white hover:bg-white/10">Ocultar</Button>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-blue-300">Resumen Ejecutivo</h4>
              <p className="text-lg leading-relaxed text-blue-50/90 font-medium">
                {aiInsights.executiveSummary}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-blue-300 flex items-center gap-2">
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
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Recomendaciones Estratégicas
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

      {/* Sección Analítica */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Gráfico de Asistencia */}
        <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-8">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black tracking-tight text-slate-900">Rendimiento de Asistencia</CardTitle>
              <p className="text-sm text-slate-500 font-medium italic">Promedio semanal de todas las unidades didácticas</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs font-bold bg-white px-3 py-1 rounded-full border">
                <div className="h-2 w-2 rounded-full bg-primary" />
                Actual
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[350px] w-full">
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
                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="asistencia" 
                    stroke="#003f98" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorAsistencia)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Feed de Actividad Ejecutiva */}
        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 p-8 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black tracking-tight">Actividad en Tiempo Real</CardTitle>
            <Activity className="h-5 w-5 text-primary animate-pulse" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {[
                { title: "Reporte de Asistencia Generado", user: "IA Insights", time: "Hace 10 min", icon: FileCheck, bg: "bg-emerald-50 text-emerald-600" },
                { title: "Cierre de Matrícula", user: "Sistema", time: "Hace 2 horas", icon: UserCheck, bg: "bg-blue-50 text-blue-600" },
                { title: "Docente Registró Firma", user: "C. Mendoza", time: "Hace 5 horas", icon: Clock, bg: "bg-indigo-50 text-indigo-600" },
                { title: "Nuevo Plan Académico", user: "Admin", time: "Ayer", icon: GraduationCap, bg: "bg-slate-50 text-slate-600" },
                { title: "Mantenimiento Sistema", user: "IT Soporte", time: "Ayer", icon: Activity, bg: "bg-red-50 text-red-600" },
              ].map((action, i) => (
                <div key={i} className="flex items-center gap-4 p-6 hover:bg-slate-50/80 transition-all cursor-pointer group">
                  <div className={`h-12 w-12 rounded-2xl ${action.bg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{action.title}</p>
                    <p className="text-xs text-slate-500 font-medium">{action.user} • {action.time}</p>
                  </div>
                  <MoreHorizontal className="h-4 w-4 text-slate-300" />
                </div>
              ))}
            </div>
          </CardContent>
          <div className="p-6 bg-slate-50/50 border-t">
            <Button variant="outline" className="w-full font-bold text-xs uppercase tracking-widest h-11">
              Ver Historial Completo
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
