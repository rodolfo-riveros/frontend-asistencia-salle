"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Presentation, Video, FileText, Image as ImageIcon, Search, GraduationCap, BrainCircuit } from "lucide-react"

const categories = [
  {
    id: "presentaciones",
    icon: Presentation,
    label: "Presentaciones & Diapositivas",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    tools: [
      { name: "Gamma.app", url: "https://gamma.app", desc: "Genera presentaciones, documentos y páginas web con IA a partir de un prompt. Plan gratis con créditos mensuales." },
      { name: "SlidesAI.io", url: "https://www.slidesai.io", desc: "Crea diapositivas desde texto con IA. Integración directa con Google Slides. Plan gratis limitado." },
      { name: "Tome.app", url: "https://tome.app", desc: "Presentaciones narrativas con IA. Ideal para storytelling educativo. Versión gratuita disponible." },
      { name: "Beautiful.ai", url: "https://www.beautiful.ai", desc: "Diseño automático de diapositivas con plantillas inteligentes. Plan gratis con restricciones." },
      { name: "Canva", url: "https://www.canva.com", desc: "Diseño gráfico con funciones mágicas de IA (Magic Design, Magic Write). Plan gratis para educadores." },
    ]
  },
  {
    id: "videos",
    icon: Video,
    label: "Edición & Creación de Videos",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    tools: [
      { name: "Invideo AI", url: "https://invideo.io", desc: "Genera videos completos con guión, voz y edición desde un texto. Plan gratis con marca de agua." },
      { name: "VEED.io", url: "https://www.veed.io", desc: "Editor de video online con subtítulos automáticos, traducción y IA. Plan gratis con límites." },
      { name: "Runway ML", url: "https://runwayml.com", desc: "Herramientas de IA para video: green screen, eliminación de fondo, generación de clips. Plan gratis." },
      { name: "Pictory", url: "https://pictory.ai", desc: "Extrae clips cortos de videos largos con IA. Ideal para crear cápsulas educativas." },
      { name: "Kapwing", url: "https://www.kapwing.com", desc: "Editor multimedia colaborativo con subtítulos automáticos y traducción. Plan gratis." },
    ]
  },
  {
    id: "texto",
    icon: FileText,
    label: "Generación de Texto & Contenido",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    tools: [
      { name: "ChatGPT", url: "https://chat.openai.com", desc: "Asistente de IA conversacional. Ideal para planificar clases, generar ejercicios y explicar conceptos." },
      { name: "Claude (Anthropic)", url: "https://claude.ai", desc: "IA con gran capacidad de análisis de documentos largos. Excelente para revisar y resumir textos académicos." },
      { name: "Gemini (Google)", url: "https://gemini.google.com", desc: "Asistente multimodal de Google. Integrado con Workspace. Gratuito con cuenta Google." },
      { name: "DeepSeek", url: "https://chat.deepseek.com", desc: "Modelo de IA gratuito con capacidad de razonamiento profundo y análisis de documentos." },
      { name: "NotebookLM (Google)", url: "https://notebooklm.google.com", desc: "Cuaderno de investigación con IA. Sube tus fuentes y genera resúmenes, guías y podcasts." },
    ]
  },
  {
    id: "docentes",
    icon: GraduationCap,
    label: "Plataformas para Docentes",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    tools: [
      { name: "MagicSchool.ai", url: "https://www.magicschool.ai", desc: "Plataforma diseñada exclusivamente para docentes. Genera planes de clase, rúbricas y evaluaciones." },
      { name: "Education Copilot", url: "https://educationcopilot.com", desc: "Asistente de IA para planificar lecciones, crear materiales y redactar comunicados." },
      { name: "Khanmigo (Khan Academy)", url: "https://www.khanacademy.org/khan-labs", desc: "Tutor de IA gratuito para estudiantes. Ayuda guiada sin dar respuestas directas." },
      { name: "Quizlet (Q-Chat)", url: "https://quizlet.com", desc: "Tarjetas de estudio con IA generativa. Crea cuestionarios automáticos desde tus apuntes." },
      { name: "Perplexity AI", url: "https://www.perplexity.ai", desc: "Buscador académico con IA. Genera respuestas con fuentes citadas. Ideal para investigación." },
    ]
  },
  {
    id: "imagenes",
    icon: ImageIcon,
    label: "Imágenes & Diseño Gráfico",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    tools: [
      { name: "Leonardo AI", url: "https://leonardo.ai", desc: "Generación de imágenes con IA. Plan gratis con créditos diarios. Ideal para ilustraciones educativas." },
      { name: "Ideogram", url: "https://ideogram.ai", desc: "Generador de imágenes con texto preciso en las ilustraciones. Plan gratis." },
      { name: "Canva (Magic Media)", url: "https://www.canva.com", desc: "Genera imágenes y gráficos con IA directamente en Canva. Plan gratis incluido." },
      { name: "Microsoft Designer", url: "https://designer.microsoft.com", desc: "Diseñador gráfico con IA de Microsoft. Integrado con Office. Gratuito con cuenta Microsoft." },
    ]
  },
  {
    id: "investigacion",
    icon: Search,
    label: "Investigación & Referencias",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    tools: [
      { name: "Google Scholar", url: "https://scholar.google.com", desc: "Buscador especializado en literatura académica. Artículos, tesis, libros y citas." },
      { name: "Consensus", url: "https://consensus.app", desc: "Buscador académico con IA que extrae conclusiones de papers científicos." },
      { name: "Elicit", url: "https://elicit.com", desc: "Asistente de investigación que encuentra y analiza papers automáticamente." },
      { name: "Scite", url: "https://scite.ai", desc: "Plataforma que muestra cómo han sido citados los artículos (citas de apoyo o contraste)." },
    ]
  },
]

export function MaterialesTab() {
  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Recopilación de herramientas de IA gratuitas y vigentes para apoyar la labor docente.
          Cada herramienta ha sido seleccionada por su utilidad práctica en el aula.
        </p>
      </div>

      <div className="space-y-10">
        {categories.map((cat) => {
          const Icon = cat.icon
          return (
            <section key={cat.id} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl ${cat.bg} border ${cat.border} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${cat.color}`} />
                </div>
                <h3 className="text-lg font-black text-foreground uppercase tracking-tight">{cat.label}</h3>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {cat.tools.map((tool) => (
                  <Card key={tool.name} className="group border border-border/60 bg-card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-bold text-foreground leading-tight">{tool.name}</CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                          <a href={tool.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </a>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <div className="bg-muted/50 border border-border rounded-2xl p-6 flex items-center gap-4">
        <BrainCircuit className="h-6 w-6 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Esta lista se actualiza periódicamente. Si conoces una herramienta gratuita útil para docentes que no esté aquí,
          contacta con el administrador del sistema para sugerir su inclusión.
        </p>
      </div>
    </div>
  )
}
