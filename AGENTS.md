# PresenciaTech — Asistencia Educativa IES La Salle Urubamba

<!-- convex-ai-start -->
Este proyecto usa [Convex](https://convex.dev) como backend en tiempo real para quizzes gamificados.

Siempre lee `convex/_generated/ai/guidelines.md` antes de escribir código Convex. Contiene reglas que anulan lo que sepas de Convex de entrenamiento previo.
<!-- convex-ai-end -->

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | `next dev --turbopack -p 9002` |
| `npm run build` | Build producción (ignora errores TS/ESLint) |
| `npm run lint` | `next lint` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run genkit:dev` | `genkit start -- tsx src/ai/dev.ts` |
| `npm run convex:dev` | `convex dev` |
| `npm run genkit:watch` | Igual con `--watch` |

**Windows**: `npm run build` falla porque `NODE_ENV=production` es sintaxis Unix. En PowerShell usa: `$env:NODE_ENV="production"; npx next build`

**No hay test runner** configurado.

## Backends

Tres backends conviven:

| Backend | URL | Propósito |
|---|---|---|
| **FastAPI** | `NEXT_PUBLIC_API_URL` (Render) | CRUD académico: periodos, programas, cursos, alumnos, docentes, asistencia, notas |
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL` | Autenticación (`supabase.auth.signInWithPassword`) |
| **Convex** | `NEXT_PUBLIC_CONVEX_URL` | Tiempo real: salas de quiz, participantes, respuestas |

La app **no usa `convex/auth.config.ts`** — la autenticación va por Supabase + FastAPI.

## Arquitectura

- **Next.js 15 App Router** + React 19 — todo en `src/`
- Path alias `@/*` → `src/*`, `@convex/*` → `convex/*`
- **shadcn/ui** en `src/components/ui/` (`components.json`)
- **Tailwind v3** + `tailwindcss-animate` — colores CSS variables HSL
- **Fuentes**: Inter (body), Manrope (headlines) vía Google Fonts `<link>`
- **API client** (`src/lib/api.ts`): extrae JWT de `localStorage` key `sb-{projectId}-auth-token` (campo `access_token` del JSON de sesión de Supabase)
- **Iconos**: `lucide-react`, utilidad `cn()` de `clsx`+`tailwind-merge`, `getInitials()` para avatares

### Rutas

```
/                               → Login
/(auth)/login, /(auth)/register
/(dashboard)/layout.tsx         → Dashboard layout (sidebar admin / topbar instructor)
  /admin/                       → Dashboard + CRUDs: periods, programs, courses, instructors, assignments, students, import, requests
  /instructor/                  → Cards de carga académica
    attendance/[id]             → Pase de lista + predicción de deserción (Genkit AI)
    quiz/[id]                   → Sala de quiz en vivo (Convex + FastAPI)
    grades/[id]                 → Libreta de notas (FastAPI + xlsx/jspdf export)
/student/quiz/join              → Estudiante se une a quiz por código PIN (Convex + FastAPI)
/student/quiz/[roomId]          → Estudiante responde quiz en vivo
```

**AI flows** (`src/ai/flows/`): `aiAttendanceInsights` y `getAdminInsights` — Genkit + Gemini 2.5 Flash. Requieren `GEMINI_API_KEY` en `.env`.

### Convex

- **Dos tablas**: `rooms` (sala de quiz) y `participants` (alumnos con score/answers/cheating flag)
- **Mutations**: `createRoom`, `joinRoom`, `submitAnswer`, `updateStatus`, `reportCheat`
- **Query**: `getRoom` (sala + participantes)
- **Cliente**: `src/components/providers/convex-provider.tsx` (usa `ConvexProvider` simple, sin auth)
- **Import**: `import { api as convexApi } from "@convex/_generated/api"` en el cliente

### Gradebook

Evaluación con instrumentos: manual, cotejo, rúbrica, escala, anecdotario, quiz.
Exporta a Excel (`xlsx`) y PDF (`jspdf` + `jspdf-autotable`).
Componentes modulares en `src/components/grades/`.

## Convenciones

- **Idioma**: Español — todo UI, prompts AI, mensajes de error
- **Estilo**: indent 4 espacios, `end_of_line = crlf` (`.editorconfig`)
- **Rol por metadata**: `user_metadata.role` — `admin` → `/admin`, cualquier otro → `/instructor`
- **SEO**: "IES LA SALLE URUBAMBA - Sistema de Gestión de Asistencia"
- **Build ignora errores** (`ignoreBuildErrors`, `eslint.ignoreDuringBuilds`) — verifica con `typecheck` + `lint` por separado
- **`.env` tiene claves reales** — no exponer en logs ni outputs

## Dependencias destacadas

`xlsx` (Excel), `jsPDF`+`jspdf-autotable` (PDF), `canvas-confetti` (efectos), `date-fns`, `react-hook-form`+`zod`, `recharts`
