
'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/courses/CourseCard';
import { Rocket, ShieldCheck, Zap, Sparkles, PlayCircle, BookOpen, GraduationCap, CheckCircle2, ArrowRight, Star, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/use-translation';
import { useBrand } from '@/lib/branding/BrandingProvider';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, limit, where, doc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function Home() {
  const { t } = useTranslation();
  const { name, tagline, logoUrl } = useBrand();
  const db = useFirestore();
  const { user } = useUser();
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
                <span className="text-primary block">{name}</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
                {t.home.heroSubtitle}
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-10">
                <Link href="/courses">
                  <Button size="lg" className="h-14 px-8 text-lg font-semibold rounded-full bg-primary hover:bg-primary/90 shadow-[0_0_40px_-10px_var(--tw-colors-primary)] transition-transform hover:scale-105">
                    {t.home.exploreBtn}
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold rounded-full gap-2 hover:bg-slate-50">
                  <PlayCircle className="h-5 w-5" />
                  {t.home.viewDemoBtn}
                </Button>
              </div>

              {/* Trust Badge */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 text-sm text-slate-600">
                <div className="flex -space-x-3">
                  <img src="https://i.pravatar.cc/100?img=1" alt="User" className="w-10 h-10 rounded-full border-2 border-white" />
                  <img src="https://i.pravatar.cc/100?img=2" alt="User" className="w-10 h-10 rounded-full border-2 border-white" />
                  <img src="https://i.pravatar.cc/100?img=3" alt="User" className="w-10 h-10 rounded-full border-2 border-white" />
                  <img src="https://i.pravatar.cc/100?img=4" alt="User" className="w-10 h-10 rounded-full border-2 border-white" />
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500">+10k</div>
                </div>
                <div className="flex flex-col items-center sm:items-start">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <span className="font-medium mt-0.5">Únete a más de 10,000 estudiantes</span>
                </div>
              </div>

            </div>
            
            <div className="flex-1 relative w-full aspect-square max-w-[500px] mx-auto lg:translate-y-6">
              <div className="absolute inset-0 bg-primary/20 rounded-[3rem] -rotate-6 scale-105 blur-xl transition-all duration-700 hover:rotate-0 hover:scale-100" />
              <div className="relative w-full h-full rounded-3xl lg:rounded-[3rem] overflow-hidden bg-white shadow-2xl flex items-center justify-center p-8 border border-white/50">
                <Image 
                  src={logoUrl} 
                  alt="Logo LearnStream"
                  fill
                  className="object-contain p-12 drop-shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-slate-50/50 border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center p-6 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6">
                  <Rocket className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-headline font-semibold mb-3">{t.home.features.accelerated.title}</h3>
                <p className="text-muted-foreground">{t.home.features.accelerated.desc}</p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
                  <ShieldCheck className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-headline font-semibold mb-3">{t.home.features.certified.title}</h3>
                <p className="text-muted-foreground">{t.home.features.certified.desc}</p>
              </div>
              <div className="flex flex-col items-center text-center p-6 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-6">
                  <Zap className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-headline font-semibold mb-3">{t.home.features.aiAssistant.title}</h3>
                <p className="text-muted-foreground">{t.home.features.aiAssistant.desc}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Real Featured Courses Section */}
        {shouldShowCoursesSection && (
          <section className="py-24 px-6 bg-white">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-16 gap-6">
                <div className="text-center md:text-left">
                  <h2 className="text-3xl md:text-5xl font-headline font-extrabold mb-4">{t.home.coursesSection.title}</h2>
                  <p className="text-muted-foreground text-lg">{t.home.coursesSection.subtitle}</p>
                </div>
                <Link href="/courses">
                  <Button variant="outline" className="font-bold h-12 px-6 rounded-full border-2 hover:bg-slate-50">
                    {t.home.coursesSection.viewAll} <ArrowRight className="ml-2 h-4 w-4" />
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

        {/* Planes & Pricing */}
        <PricingSection />

        {/* Instructor Invitation Section */}
        <section className="py-24 px-6 relative bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="bg-[#0F172A] rounded-3xl lg:rounded-[3.5rem] overflow-hidden flex flex-col lg:flex-row items-stretch shadow-2xl border border-white/5 relative">
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
                    <Button className="h-16 px-12 text-xl font-black rounded-3xl bg-[#4F46E5] hover:bg-[#4338CA] transition-all hover:scale-[1.03] shadow-[0_0_40px_-5px_rgba(79,70,229,0.4)] gap-3 border-none text-white">
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

        {/* FAQ Section */}
        <LandingFAQ />

        {/* CTA Section */}
        <section className="py-24 px-6 bg-white pb-32">
          <div className="max-w-5xl mx-auto rounded-3xl lg:rounded-[3.5rem] bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-12 lg:p-24 text-center relative overflow-hidden shadow-2xl border-4 border-slate-800">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-headline font-extrabold text-white mb-6 leading-tight">Empieza a programar <br className="hidden md:block"/>tu futuro hoy mismo</h2>
              <p className="text-slate-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
                No necesitas experiencia previa. Únete a miles de estudiantes que ya están transformando sus carreras profesionales con la ayuda de la Inteligencia Artificial.
              </p>
              <Link href="/register">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white h-16 px-12 text-xl font-bold rounded-full shadow-[0_0_40px_-5px_var(--tw-colors-primary)] transition-transform hover:scale-105">
                  Comenzar prueba gratis ahora
                </Button>
              </Link>
              <p className="text-slate-500 text-sm mt-6">Sin tarjeta de crédito requerida.</p>
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
            <span className="font-headline font-bold text-lg">{name}</span>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-primary transition-colors">{t.common.language === 'es' ? 'Términos' : 'Terms'}</Link>
            <Link href="#" className="hover:text-primary transition-colors">{t.common.language === 'es' ? 'Privacidad' : 'Privacy'}</Link>
            <Link href="#" className="hover:text-primary transition-colors">{t.common.language === 'es' ? 'Soporte' : 'Support'}</Link>
            <Link href="#" className="hover:text-primary transition-colors">{t.common.language === 'es' ? 'Contacto' : 'Contact'}</Link>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 {name}. {t.common.language === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}</p>
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

function PricingSection() {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-headline font-extrabold mb-4">Planes diseñados para tu éxito</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Comienza gratis o desbloquea todo el potencial con nuestra suscripción premium. Cancela en cualquier momento.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Free Plan */}
        <div className="bg-white rounded-[3rem] p-10 border shadow-sm flex flex-col items-center text-center">
          <h3 className="text-2xl font-bold mb-2">Comunidad</h3>
          <p className="text-muted-foreground mb-6">Ideal para dar tus primeros pasos.</p>
          <div className="text-5xl font-black mb-6">$0 <span className="text-xl text-muted-foreground font-normal">/mes</span></div>
          
          <ul className="space-y-4 mb-8 text-left w-full pl-4 md:pl-10">
            <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-500" /> Acceso a cursos gratuitos</li>
            <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-500" /> Comunidad básica</li>
            <li className="flex items-center gap-3 text-muted-foreground"><span className="w-5 h-5 flex items-center justify-center">-</span> Sin certificados oficiales</li>
            <li className="flex items-center gap-3 text-muted-foreground"><span className="w-5 h-5 flex items-center justify-center">-</span> Sin IA ni proyectos reales</li>
          </ul>
          
          <Link href="/register" className="w-full">
            <Button size="lg" variant="outline" className="w-full text-lg h-14 rounded-full font-bold">Crear cuenta gratis</Button>
          </Link>
        </div>

        {/* Premium Plan */}
        <div className="bg-[#0F172A] text-white rounded-[3rem] p-10 shadow-2xl relative border border-[#1E293B] flex flex-col items-center text-center transform md:-translate-y-4">
          <div className="absolute top-0 right-10 bg-primary text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-b-lg">
            Recomendado
          </div>
          <h3 className="text-2xl font-bold mb-2 text-white">PRO</h3>
          <p className="text-slate-400 mb-6">La carrera completa hacia el seniority.</p>
          <div className="text-5xl font-black mb-6 flex items-end justify-center">
            $24 <span className="text-xl text-slate-400 font-normal mb-1 ml-1">USD/mes</span>
          </div>
          
          <ul className="space-y-4 mb-8 text-left w-full pl-4 md:pl-10">
            <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /> <b>Acceso a todos los cursos VIP</b></li>
            <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /> Certificados Blockchain/QR</li>
            <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /> Tutor IA Personalizado</li>
            <li className="flex items-center gap-3"><Check className="h-5 w-5 text-emerald-400" /> Proyectos reales para Portafolio</li>
          </ul>
          
          <Link href="/register?plan=pro" className="w-full">
            <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-white text-lg h-14 rounded-full font-bold shadow-[0_0_30px_-5px_var(--tw-colors-primary)]">
              Desbloquear Premium
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function LandingFAQ() {
  return (
    <section className="py-24 px-6 bg-white overflow-hidden" id="faq">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-headline font-extrabold mb-4">Preguntas Frecuentes</h2>
          <p className="text-muted-foreground text-lg">Todo lo que necesitas saber antes de empezar tu camino.</p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          <AccordionItem value="item-1" className="bg-slate-50 px-6 rounded-2xl border-none data-[state=open]:shadow-md transition-all">
            <AccordionTrigger className="hover:no-underline font-bold text-lg py-6">¿Obtengo certificado oficial al terminar?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
              Sí, todos nuestros cursos premium incluyen un certificado validado con un código QR único. Puedes añadirlo a LinkedIn para que los reclutadores validen en tiempo real tus nuevas habilidades adquiridas.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-2" className="bg-slate-50 px-6 rounded-2xl border-none data-[state=open]:shadow-md transition-all">
            <AccordionTrigger className="hover:no-underline font-bold text-lg py-6">¿Qué métodos de pago aceptan?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
              Aceptamos pagos internacionales a través de tarjeta de crédito/débito y múltiples métodos locales en Latinoamérica mediante nuestra pasarela Epayco.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-3" className="bg-slate-50 px-6 rounded-2xl border-none data-[state=open]:shadow-md transition-all">
            <AccordionTrigger className="hover:no-underline font-bold text-lg py-6">¿Cómo funciona el Tutor de IA?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
              El asistente virtual de IA puede analizar tu código en tiempo real, explicarte conceptos complejos con ejemplos locales y crearte desafíos interactivos al vuelo para que no te quedes atascado en ninguna lección.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-4" className="bg-slate-50 px-6 rounded-2xl border-none data-[state=open]:shadow-md transition-all">
            <AccordionTrigger className="hover:no-underline font-bold text-lg py-6">¿Puedo ser instructor?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
              ¡Claro que sí! Si dominas un tema técnico, puedes crear y monetizar tu propio curso. Tienes analíticas completas, embudos de conversión y te llevas el 70% de las regalías.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
