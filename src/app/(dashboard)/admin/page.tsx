
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, BookOpen, FileCheck, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const stats = [
    { name: "Programas", value: "12", icon: GraduationCap, color: "bg-blue-500/10 text-blue-600" },
    { name: "Docentes", value: "48", icon: Users, color: "bg-purple-500/10 text-purple-600" },
    { name: "Cursos Activos", value: "156", icon: BookOpen, color: "bg-indigo-500/10 text-indigo-600" },
    { name: "Asistencia Hoy", value: "94%", icon: FileCheck, color: "bg-green-500/10 text-green-600" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Panel de Control Ejecutivo</h2>
          <p className="text-slate-500 text-sm font-medium">Análisis y gestión estratégica del IES LA SALLE URUBAMBA.</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">{new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.name}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-slate-900">{stat.value}</div>
              <div className="flex items-center gap-1 mt-2 text-green-600 text-xs font-bold">
                <TrendingUp className="h-3 w-3" />
                <span>+2.4%</span>
                <span className="text-slate-400 font-medium ml-1">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 px-6">
            <CardTitle className="text-lg font-bold">Rendimiento de Asistencia por Programa</CardTitle>
            <Badge variant="outline" className="bg-white">Ciclo 2024-II</Badge>
          </CardHeader>
          <CardContent className="h-[350px] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-primary opacity-20" />
            </div>
            <p className="text-slate-400 font-medium italic">Gráfico detallado de asistencia acumulada por facultades</p>
            <p className="text-xs text-slate-300 mt-2">Los datos se actualizan automáticamente cada 24 horas.</p>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 px-6">
            <CardTitle className="text-lg font-bold">Acciones Recientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y">
                {[
                  { title: "Importación de Cursos", sub: "Ciclo 2024-II", time: "2 horas", type: "system" },
                  { title: "Nueva Matrícula", sub: "Mateo Alvarez", time: "5 horas", type: "user" },
                  { title: "Docente Registrado", sub: "Ing. Carlos Mendoza", time: "1 día", type: "user" },
                  { title: "Actualización de Plan", sub: "Sistemas de Info.", time: "2 días", type: "system" },
                ].map((action, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className={`h-2.5 w-2.5 rounded-full ${action.type === 'system' ? 'bg-primary' : 'bg-accent'}`} />
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">{action.title}</p>
                      <p className="text-xs text-slate-500">{action.sub}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase">{action.time}</span>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
