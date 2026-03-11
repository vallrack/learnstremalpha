'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, BookOpen } from 'lucide-react';

export function CourseCard({ course }: { course: any }) {
  // Usamos thumbnailDataUrl como fuente principal de la imagen
  const imageSrc = course.thumbnailDataUrl || course.imageUrl || 'https://picsum.photos/seed/course/800/450';

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 flex flex-col h-full bg-card">
      <Link href={`/courses/${course.id}`}>
        <div className="relative aspect-video overflow-hidden">
          <Image 
            src={imageSrc} 
            alt={course.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized={imageSrc.startsWith('data:')}
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
          {course.isFree ? (
            <Badge className="absolute top-3 right-3 bg-emerald-500 hover:bg-emerald-600 border-none">Gratis</Badge>
          ) : (
            <Badge className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-600 border-none text-white">Premium</Badge>
          )}
        </div>
      </Link>
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Badge variant="secondary" className="font-normal rounded-lg">{course.category || 'General'}</Badge>
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Curso Real</span>
        </div>
        <Link href={`/courses/${course.id}`}>
          <h3 className="font-headline font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors text-foreground">
            {course.title}
          </h3>
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-2 flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {course.description}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex items-center justify-between border-t border-border/40 mt-auto">
        <span className="text-xs font-medium text-muted-foreground">Por {course.instructorName || 'Instructor'}</span>
        <Link href={`/courses/${course.id}`}>
          <div className="text-primary hover:text-primary/80 transition-colors">
            <PlayCircle className="h-8 w-8" />
          </div>
        </Link>
      </CardFooter>
    </Card>
  );
}
