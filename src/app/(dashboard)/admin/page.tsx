
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, BookOpen, FileCheck } from "lucide-react";

export default function AdminDashboard() {
  const stats = [
    { name: "Programas", value: "12", icon: GraduationCap, color: "text-blue-600" },
    { name: "Docentes", value: "48", icon: Users, iconColor: "text-purple-600" },
    { name: "Cursos Activos", value: "156", icon: BookOpen, iconColor: "text-indigo-600" },
    { name: "Asistencia Hoy", value: "94%", icon: FileCheck, iconColor: "text-green-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Panel de Control</h2>
        <p className="text-muted-foreground">Resumen general del estado del sistema educativo.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.iconColor || 'text-primary'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">+2% desde el último mes</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Asistencia por Programa</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/20">
            <span className="text-muted-foreground italic">Gráfico de asistencia acumulada</span>
          </CardContent>
        </Card>
        <Card className="col-span-3 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Acciones Recientes</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-4 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="font-medium">Importación de Cursos - Ciclo 2024-II</p>
                      <p className="text-xs text-muted-foreground">Hace 2 horas por Admin</p>
                    </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
