
/**
 * @fileOverview Archivo de redirección para evitar conflictos de rutas Next.js.
 * La lógica oficial reside en src/app/(dashboard)/instructor/quiz/[id]/page.tsx
 */
import { redirect } from 'next/navigation';

export default async function RedirectPage(props: any) {
  const { id } = await props.params;
  redirect(`/instructor/quiz/${id}`);
}
