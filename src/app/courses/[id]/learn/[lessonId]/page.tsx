import LessonPlayerClient from './LessonPlayerClient';

// Configuración de segmento para Vercel (Hobby plan soporta hasta 60s)
export const maxDuration = 60;

export default function LessonPage() {
  return <LessonPlayerClient />;
}
