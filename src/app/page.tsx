
'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/courses/CourseCard';
import { Rocket, ShieldCheck, Zap, Sparkles, PlayCircle, BookOpen, GraduationCap, CheckCircle2, ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/use-translation';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, limit, where, doc } from 'firebase/firestore';
import { useState, useEffect } from 'react';

export default function Home() {
  const { t } = useTranslation();
  const db = useFirestore();
  const { user } = useUser();
  const logoUrl = "https://drive.google.com/uc?export=view&id=16eSjcZhzvz1dGapFrNVFXSQ_kG4dyg0i";
  const instructorImageUrl = "https://lh3.googleusercontent.com/d/1FujdqLfrqmCYNzP-TfuGlO9SKaBN8HIh";

  // Verificación de acceso administrativo
  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  const hasManagementAccess = profile?.role === 'admin' || profile?.role === 'instructor';

  const coursesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'courses'), 
      where('isActive', '==', true),
      limit(3)
    );
  }, [db]);

  const { data: featuredCourses, isLoading } = useCollection(coursesQuery);

  // Lógica de visibilidad corregida: Solo mostrar la sección si hay cursos o está cargando.
  // El estado vacío con botón de admin se quita del Home para mantenerlo profesional.
  const shouldShowCoursesSection = isLoading || (featuredCourses && featuredCourses.length > 0);

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
        {shouldShowCoursesSection && (
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
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {featuredCourses?.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Testimonios reales */}
        <LandingTestimonials />

        {/* Instructor Invitation Section (Improved Design) */}
        <section className="py-24 px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="bg-[#0F172A] rounded-[3.5rem] overflow-hidden flex flex-col lg:flex-row items-stretch shadow-2xl border border-white/5 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />
              
              <div className="flex-1 p-10 lg:p-24 space-y-10 z-10">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] uppercase tracking-widest font-black">
                    <GraduationCap className="h-3.5 w-3.5" />
                    Conviértete en Instructor
                  </div>
                  <h2 className="text-4xl lg:text-6xl font-headline font-extrabold text-white leading-[1.1] tracking-tight">
                    ¿Eres un experto <br/>en tu campo?
                  </h2>
                  <p className="text-slate-400 text-lg lg:text-xl leading-relaxed max-w-lg">
                    Únete a nuestra comunidad de instructores y monetiza tu conocimiento compartiendo lo que sabes con miles de estudiantes.
                  </p>
                </div>

                <div className="space-y-5">
                  {[
                    "Gana el 70% de cada venta generada",
                    "Herramientas de IA para evaluar desafíos",
                    "Potencia tu marca personal en la industria"
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <div className="bg-emerald-500/10 p-1.5 rounded-full border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </div>
                      <span className="text-slate-200 font-bold text-base lg:text-lg">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Link href="/instructor/apply">
                    <Button className="h-16 px-12 text-xl font-black rounded-3xl bg-[#4F46E5] hover:bg-[#4338CA] transition-all hover:scale-[1.03] shadow-[0_0_40px_-5px_rgba(79,70,229,0.4)] gap-3">
                      Empezar a enseñar hoy
                      <ArrowRight className="h-6 w-6" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex-1 relative min-h-[450px] lg:min-h-0 bg-slate-800/50">
                <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A] via-transparent to-transparent z-10 hidden lg:block" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent z-10 lg:hidden" />
                <Image 
                  src={instructorImageUrl} 
                  alt="Expert Mastered Skills" 
                  fill 
                  className="object-cover lg:object-center"
                  unoptimized
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

function LandingTestimonials() {
  const db = useFirestore();
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!db) return;
    import('firebase/firestore').then(({ collectionGroup, getDocs, query, where, orderBy, limit: fsLimit }) => {
      getDocs(query(
        collectionGroup(db, 'ratings'),
        where('rating', '>=', 4),
        orderBy('rating', 'desc'),
        orderBy('createdAt', 'desc'),
        fsLimit(6)
      )).then(snap => {
        const data = snap.docs.map(d => d.data()).filter(d => d.comment?.trim().length > 15);
        setReviews(data.slice(0, 6));
      }).catch(() => {});
    });
  }, [db]);

  if (reviews.length === 0) return null;

  return (
    <section className="py-24 px-6 bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-xs uppercase tracking-widest font-black mb-4">
            <Star className="h-3.5 w-3.5 fill-amber-400" /> Testimonios reales
          </div>
          <h2 className="text-3xl md:text-5xl font-headline font-extrabold text-white mb-4 leading-tight">
            Lo que dicen nuestros estudiantes
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Reseñas auténticas de quienes ya recorrieron el camino.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-[2rem] p-7 space-y-4 hover:bg-white/8 transition-colors">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`h-4 w-4 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-white/10'}`} />
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed italic line-clamp-4">
                &ldquo;{r.comment}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                {r.profileImageUrl ? (
                  <img src={r.profileImageUrl} alt={r.displayName} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/30 flex items-center justify-center text-white font-bold text-sm">
                    {r.displayName?.[0]?.toUpperCase() || 'E'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-white">{r.displayName || 'Estudiante'}</p>
                  <p className="text-[10px] text-slate-500">Estudiante verificado ✓</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
