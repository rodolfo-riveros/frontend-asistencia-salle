# PresenciaTech — Asistencia Educativa IES La Salle Urubamba

<!-- convex-ai-start -->
Siempre lee `convex/_generated/ai/guidelines.md` antes de escribir código Convex. Anula lo que sepas de Convex de entrenamiento previo.
<!-- convex-ai-end -->

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | `next dev --turbopack -p 9002` |
| `npm run build` | Ignora errores TS/ESLint (`next.config.ts`) |
| `npm run lint` | `next lint` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run genkit:dev` | `genkit start -- tsx src/ai/dev.ts` |
| `npm run convex:dev` | `convex dev` |

**Windows**: `npm run build` no funciona (sintaxis Unix). Usa: `$env:NODE_ENV="production"; npx next build`

**No hay test runner** — verifica con `typecheck` + `lint` por separado. No hay `.github/` CI.

## Backends

| Backend | Uso |
|---|---|
| **FastAPI** (`NEXT_PUBLIC_API_URL` — Render) | CRUD académico (periodos, programas, cursos, alumnos, docentes, asistencia, notas) |
| **Supabase** (`NEXT_PUBLIC_SUPABASE_URL`) | Autenticación (`supabase.auth.signInWithPassword`) |
| **Convex** (`NEXT_PUBLIC_CONVEX_URL`) | Tiempo real: salas de quiz, participantes, respuestas |

## Arquitectura

- **Next.js 15 App Router** + React 19 — todo en `src/`
- Path alias `@/*` → `src/*`, `@convex/*` → `convex/*`
- **shadcn/ui** (`src/components/ui/`, `components.json`), **Tailwind v3** + `tailwindcss-animate`, colores HSL variables CSS
- **API client** (`src/lib/api.ts:10`): extrae JWT de sesión Supabase (`supabase.auth.getSession()`), destino FastAPI
- **Auth**: solo Supabase; NO usa `convex/auth.config.ts`. Rol por `user_metadata.role` — `admin` → `/admin`, otro → `/instructor`
- **Supabase storage key**: `salle-auth-v5`. Cliente admin auxiliar `supabaseAdminTask` (sin persistencia de sesión) en `src/lib/supabase.ts`
- **Fuentes**: Inter (body), Manrope (headlines) vía Google Fonts en `src/app/layout.tsx`
- **Iconos**: `lucide-react`, utilidad `cn()` de `clsx`+`tailwind-merge`, `getInitials()` para avatares
- **Idioma**: Español — todo UI, prompts AI, mensajes de error
- **Estilo**: indent 4 espacios, `end_of_line = crlf` (`.editorconfig`)
- **`.env`**: claves reales de producción — **no exponer en logs ni outputs**. No existe `.env.example`.

### Rutas

```
/                          → Login
/(auth)/login, /register
/(dashboard)/              → Sidebar admin / topbar instructor
  /admin/                  → CRUDs: periods, programs, courses, instructors, assignments, students, import, requests, recovery
  /instructor/             → Cards carga académica
    attendance/[id]        → Pase de lista + predicción deserción (Genkit AI)
    quiz/[id]              → Sala quiz en vivo (Convex + FastAPI)
    grades/[id]            → Libreta de notas (FastAPI + xlsx/jspdf export)
/student/quiz/join         → Estudiante se une por código PIN (Convex + FastAPI)
/student/quiz/[roomId]     → Estudiante responde quiz
```

### Convex (tiempo real)

- **2 tablas** en `convex/schema.ts`: `rooms` (código, estado, preguntas, configId, unidadId) y `participants` (alumno_id, score, avatar, isCheating, answers)
- **Mutations**: `createRoom`, `joinRoom`, `submitAnswer`, `updateStatus`, `reportCheat`
- **Query**: `getRoom` (sala + participantes)
- Cliente: `src/components/providers/convex-provider.tsx` — `ConvexProvider` simple, sin auth
- Import: `import { api as convexApi } from "@convex/_generated/api"`

### AI (Genkit)

- `src/ai/genkit.ts`: modelo `googleai/gemini-2.5-flash`, requiere `GEMINI_API_KEY`
- Flows en `src/ai/flows/`: `admin-dashboard-insights`, `ai-attendance-insights`, `generate-quiz-flow`, `generate-recovery-quiz-flow`, `generate-sesion-flow`, `analyze-instrument-flow`, `ai-academic-insights`

### Gradebook

Evaluación con instrumentos: manual, cotejo, rúbrica, escala, anecdotario, quiz. Exporta Excel (`xlsx`) y PDF (`jspdf`+`jspdf-autotable`). Componentes modulares en `src/components/grades/`.

## Conocimiento del repositorio

- `docs/` contiene `blueprint.md` (visión general), `backend.json` (entidades FastAPI), `supabase_schema.sql`
- `supabase/migration_seccion.sql`: migración que movió `seccion` de `alumnos` a `matriculas`, y creó vista `v_alumnos_por_unidad`
- `skills-lock.json` referencia skills Convex AI (`npx convex ai-files install`)
- `apphosting.yaml` para Firebase App Hosting (max 1 instancia)
