'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, BookOpen, User } from 'lucide-react';

export function CourseCard({ course }: { course: any }) {
  // Usamos thumbnailDataUrl como fuente principal de la imagen (Base64) o imageUrl (URL externa)
  const imageSrc = course.thumbnailDataUrl || course.imageUrl || 'https://picsum.photos/seed/course/800/450';

  // Determinamos si debemos saltar la optimización de Next.js.
  // Optimizar solo fuentes conocidas y confiables (Unsplash, Picsum, Placehold). 
  // Todo lo demás (Drive, Base64, dominios externos) se sirve sin optimizar para evitar errores de configuración.
  const isOptimizable = imageSrc.includes('images.unsplash.com') || imageSrc.includes('picsum.photos') || imageSrc.includes('placehold.co');
  const shouldSkipOptimization = !isOptimizable || imageSrc.startsWith('data:');

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 flex flex-col h-full bg-card rounded-[2rem]">
      <Link href={`/courses/${course.id}`}>
        <div className="relative aspect-video overflow-hidden bg-slate-100">
          <Image 
            src={imageSrc} 
            alt={course.title || 'Curso'}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized={shouldSkipOptimization}
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
          {course.isFree ? (
            <Badge className="absolute top-3 right-3 bg-emerald-500 hover:bg-emerald-600 border-none shadow-sm">Gratis</Badge>
          ) : (
            <Badge className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-600 border-none text-white shadow-sm">Premium</Badge>
          )}
        </div>
      </Link>
      <CardHeader className="p-6 pb-0">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
          <Badge variant="secondary" className="font-bold rounded-lg px-2 py-0.5 h-5 bg-primary/5 text-primary border-none lowercase first-letter:uppercase">{course.category || 'General'}</Badge>
          <span className="flex items-center gap-1 font-medium"><BookOpen className="h-3 w-3" /> Curso Real</span>
        </div>
        <Link href={`/courses/${course.id}`}>
          <h3 className="font-headline font-bold text-xl line-clamp-1 group-hover:text-primary transition-colors text-slate-900">
            {course.title}
          </h3>
        </Link>
      </CardHeader>
      <CardContent className="p-6 pt-3 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {course.description}
        </p>
      </CardContent>
      <CardFooter className="p-6 pt-0 flex items-center justify-between border-t border-slate-50 mt-auto">
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1.5 rounded-full">
            <User className="h-3 w-3 text-slate-400" />
          </div>
          <span className="text-[11px] font-bold text-slate-600 truncate max-w-[150px]">Por {course.instructorName || 'Experto'}</span>
        </div>
        <Link href={course.isFree ? `/courses/${course.id}` : `/checkout?courseId=${course.id}`}>
          <div className="text-primary hover:text-primary/80 transition-all hover:scale-110">
            <PlayCircle className="h-8 w-8 fill-primary/10" />
          </div>
        </Link>
      </CardFooter>
    </Card>
  );
}
