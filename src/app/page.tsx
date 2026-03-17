
'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/courses/CourseCard';
import { Rocket, ShieldCheck, Zap, Sparkles, PlayCircle, Loader2, BookOpen, GraduationCap, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/use-translation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, limit, where } from 'firebase/firestore';

export default function Home() {
  const { t } = useTranslation();
  const db = useFirestore();
  const logoUrl = "https://drive.google.com/uc?export=view&id=16eSjcZhzvz1dGapFrNVFXSQ_kG4dyg0i";
  const instructorImageUrl = "https://drive.google.com/uc?export=view&id=1FujdqLfrqmCYNzP-TfuGlO9SKaBN8HIh";

  // Consulta real de cursos desde Firestore (limitado a 3 para el Home)
  const coursesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'courses'), 
      where('isActive', '==', true),
      limit(3)
    );
  }, [db]);

  const { data: featuredCourses, isLoading } = useCollection(coursesQuery);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-6 lg:py-32 overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
                <Sparkles className="h-4 w-4" />
                {t.home.heroBadge}
              </div>
              <h1 className="text-4xl lg:text-7xl font-headline font-bold mb-6 leading-tight">
                {t.home.heroTitle.split('LearnStream')[0]}
                <span className="text-primary block">LearnStream</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
                {t.home.heroSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link href="/courses">
                  <Button size="lg" className="h-14 px-8 text-lg font-semibold rounded-full bg-primary hover:bg-primary/90">
                    {t.home.exploreBtn}
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold rounded-full gap-2">
                  <PlayCircle className="h-5 w-5" />
                  {t.home.viewDemoBtn}
                </Button>
              </div>
            </div>
            
            <div className="flex-1 relative w-full aspect-square max-w-[500px] mx-auto">
              <div className="absolute inset-0 bg-primary/5 rounded-[3rem] -rotate-2 scale-105" />
              <div className="relative w-full h-full rounded-[3rem] overflow-hidden bg-white shadow-2xl flex items-center justify-center p-8">
                <Image 
                  src={logoUrl} 
                  alt="Logo LearnStream"
                  fill
                  className="object-contain p-12"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-card border-y">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Rocket className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-headline font-semibold mb-3">{t.home.features.accelerated.title}</h3>
                <p className="text-muted-foreground">{t.home.features.accelerated.desc}</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-headline font-semibold mb-3">{t.home.features.certified.title}</h3>
                <p className="text-muted-foreground">{t.home.features.certified.desc}</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-headline font-semibold mb-3">{t.home.features.aiAssistant.title}</h3>
                <p className="text-muted-foreground">{t.home.features.aiAssistant.desc}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Real Featured Courses Section */}
        <section className="py-24 px-6 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-12 gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-headline font-bold mb-4">{t.home.coursesSection.title}</h2>
                <p className="text-muted-foreground">{t.home.coursesSection.subtitle}</p>
              </div>
              <Link href="/courses">
                <Button variant="link" className="text-primary font-bold p-0 h-auto text-lg">
                  {t.home.coursesSection.viewAll}
                </Button>
              </Link>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-video bg-muted animate-pulse rounded-[2.5rem]" />
                ))}
              </div>
            ) : featuredCourses && featuredCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredCourses.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed max-w-2xl mx-auto flex flex-col items-center gap-4">
                <BookOpen className="h-12 w-12 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground font-medium">Estamos preparando contenido increíble para ti.</p>
                <Link href="/admin">
                  <Button variant="outline">Crear primer curso</Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Instructor Invitation Section */}
        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-slate-900 rounded-[3rem] overflow-hidden flex flex-col lg:flex-row items-center shadow-2xl">
              <div className="flex-1 p-12 lg:p-20 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-sm font-bold">
                  <GraduationCap className="h-4 w-4" />
                  Conviértete en Instructor
                </div>
                <h2 className="text-3xl lg:text-5xl font-headline font-bold text-white">
                  {t.home.instructorSection.title}
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                  {t.home.instructorSection.subtitle}
                </p>
                <ul className="space-y-4">
                  {[
                    t.home.instructorSection.benefit1,
                    t.home.instructorSection.benefit2,
                    t.home.instructorSection.benefit3
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-white font-medium">
                      <div className="bg-emerald-500/20 p-1 rounded-full">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                      {benefit}
                    </li>
                  ))}
                </ul>
                <Link href="/instructor/apply">
                  <Button size="lg" className="h-14 px-10 text-lg font-bold rounded-full bg-primary hover:bg-primary/90 mt-4 shadow-xl shadow-primary/20">
                    {t.home.instructorSection.btn}
                  </Button>
                </Link>
              </div>
              <div className="flex-1 relative w-full aspect-square lg:aspect-auto h-full min-h-[400px]">
                <Image 
                  src={instructorImageUrl} 
                  alt="Instructor" 
                  fill 
                  className="object-cover transition-all duration-700"
                  unoptimized
                  data-ai-hint="instructor teacher"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto rounded-[3rem] bg-primary p-12 lg:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <h2 className="text-3xl lg:text-5xl font-headline font-bold text-white mb-6">{t.home.ctaTitle}</h2>
              <p className="text-primary-foreground/80 text-lg mb-10 max-w-2xl mx-auto">
                {t.home.ctaSubtitle}
              </p>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 h-14 px-10 text-lg font-bold rounded-full">
                {t.home.ctaBtn}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 px-6 bg-card">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 overflow-hidden rounded-lg">
              <Image 
                src={logoUrl} 
                alt="Logo LearnStream" 
                fill 
                className="object-contain" 
              />
            </div>
            <span className="font-headline font-bold text-lg">LearnStream</span>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-primary transition-colors">{t.common.language === 'es' ? 'Términos' : 'Terms'}</Link>
            <Link href="#" className="hover:text-primary transition-colors">{t.common.language === 'es' ? 'Privacidad' : 'Privacy'}</Link>
            <Link href="#" className="hover:text-primary transition-colors">{t.common.language === 'es' ? 'Soporte' : 'Support'}</Link>
            <Link href="#" className="hover:text-primary transition-colors">{t.common.language === 'es' ? 'Contacto' : 'Contact'}</Link>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 LearnStream. {t.common.language === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}</p>
        </div>
      </footer>
    </div>
  );
}
