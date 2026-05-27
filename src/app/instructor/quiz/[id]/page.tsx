
/**
 * @fileOverview Archivo neutralizado para evitar conflictos de rutas Next.js.
 * La lógica de la Arena de Gamificación reside exclusivamente en:
 * src/app/(dashboard)/instructor/quiz/[id]/page.tsx
 */
import { redirect } from 'next/navigation';

export default async function NeutralizedConflictPage(props: any) {
  const { id } = await props.params;
  // Redirigir a la ruta oficial dentro del grupo (dashboard) para heredar el layout institucional
  redirect(`/instructor/quiz/${id}`);
}
