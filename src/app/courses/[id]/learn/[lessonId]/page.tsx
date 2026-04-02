import LessonPlayerClient from './LessonPlayerClient';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Configuración de segmento para Vercel (Hobby plan soporta hasta 60s)
export const maxDuration = 60;

export default function LessonPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LessonPlayerClient />
    </Suspense>
  );
}
