'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { CourseCertificate } from '@/components/courses/CourseCertificate';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Printer, Share2, Loader2, AlertCircle, Eye, FileImage, FileDown } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useState, useEffect, Suspense } from 'react';
import { useToast } from '@/components/ui/use-toast';

export default function CertificatePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <CertificateContent />
    </Suspense>
  );
}

function CertificateContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const isPreview = searchParams.get('preview') === 'true';
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const courseRef = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return doc(db, 'courses', courseId);
  }, [db, courseId]);
  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const progressRef = useMemoFirebase(() => {
    if (!db || !user?.uid || !courseId || isPreview) return null;
    return doc(db, 'users', user.uid, 'courseProgress', courseId);
  }, [db, user?.uid, courseId, isPreview]);
  const { data: progress } = useDoc(progressRef);

  const modulesQuery = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return collection(db, 'courses', courseId, 'modules');
  }, [db, courseId]);
  const { data: modules } = useCollection(modulesQuery);

  const handleExportImage = async () => {
    try {
      setIsExporting(true);
      const element = document.querySelector('.certificate-container') as HTMLElement;
      if (!element) return;
      
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        scale: 2, // Alta calidad
        useCORS: true, // Permite imágenes externas si los headers lo soportan
        backgroundColor: '#ffffff'
      });
      
      const image = canvas.toDataURL('image/jpeg', 1.0);
      const link = document.createElement('a');
      link.download = `Certificado_${course?.title || 'LearnStream'}.jpg`;
      link.href = image;
      link.click();
    } catch (error) {
      console.error("Error exportando imagen:", error);
      toast({ variant: "destructive", title: "Error al exportar", description: "No se pudo generar la imagen." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const element = document.querySelector('.certificate-container') as HTMLElement;
      if (!element) return;
      
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // Crear PDF con las dimensiones exactas del canvas para evitar bordes blancos
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Certificado_${course?.title || 'LearnStream'}.pdf`);
    } catch (error) {
      console.error("Error exportando PDF:", error);
      toast({ variant: "destructive", title: "Error al exportar", description: "No se pudo generar el PDF." });
    } finally {
      setIsExporting(false);
    }
  };

  if (!mounted || isUserLoading || isCourseLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si no es preview, validar que el curso esté completado (salvo para admins)
  if (!isPreview && profile?.role !== 'admin' && (!course || !progress || progress.status !== 'completed')) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 text-center p-6">
        <AlertCircle className="h-12 w-12 text-amber-50" />
        <h1 className="text-2xl font-bold">Certificado no disponible</h1>
        <p className="text-muted-foreground">Debes completar el 100% del curso para obtener tu certificación.</p>
        <Button onClick={() => router.back()}>Volver</Button>
      </div>
    );
  }

  // Si es preview y no hay curso cargado todavía
  if (isPreview && !course) {
    return <div className="p-20 text-center">Curso no encontrado para vista previa.</div>;
  }

  const studentName = isPreview ? "Nombre del Estudiante" : (profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Estudiante');
  const completionDate = isPreview ? new Date().toLocaleDateString() : (progress?.completedAt ? new Date(progress.completedAt.toDate()).toLocaleDateString() : new Date().toLocaleDateString());
  const isPremium = isPreview ? true : (profile?.role === 'admin' || !!profile?.isPremiumSubscriber);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col print:bg-white">
      <div className="print:hidden">
        <Navbar />
      </div>
      
      <main className="flex-1 flex flex-col items-center py-12 px-6">
        <div className="max-w-5xl w-full space-y-8 flex flex-col items-center">
          <header className="w-full flex items-center justify-between print:hidden">
            <Button variant="ghost" onClick={() => router.back()} className="rounded-xl gap-2">
              <ChevronLeft className="h-4 w-4" />
              {isPreview ? 'Volver al Admin' : 'Volver al Curso'}
            </Button>
            
            {isPreview && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-2xl border border-amber-200 text-xs font-bold">
                <Eye className="h-4 w-4" />
                Modo Vista Previa
              </div>
            )}

            <div className="flex items-center flex-wrap gap-3">
              <Button variant="outline" className="rounded-xl gap-2" onClick={handleExportImage} disabled={isExporting}>
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4 text-emerald-600" />}
                Descargar JPG
              </Button>
              <Button variant="outline" className="rounded-xl gap-2" onClick={handleExportPDF} disabled={isExporting}>
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4 text-red-600" />}
                Descargar PDF
              </Button>
              <Button className="rounded-xl gap-2 shadow-lg shadow-primary/20">
                <Share2 className="h-4 w-4" />
                Compartir Logro
              </Button>
            </div>
          </header>

          <div className="w-full overflow-x-auto py-8 px-2 flex justify-center">
            <div className="min-w-[900px]">
              <CourseCertificate 
                studentName={studentName}
                courseTitle={course?.title || 'Título del Curso'}
                technology={course?.technology || 'General'}
                isPremium={isPremium}
                completionDate={completionDate}
                modulesCount={modules?.length || 0}
                instructorName={course?.instructorName}
                certificateId={isPreview ? "PREVIEW-ID" : `${user?.uid}_${courseId}`}
              />
            </div>
          </div>

          <section className="max-w-2xl text-center space-y-4 print:hidden">
            <h2 className="text-2xl font-headline font-bold">
              {isPreview ? 'Así verán los estudiantes su certificado' : '¡Felicidades por tu graduación!'}
            </h2>
            <p className="text-muted-foreground">
              {isPreview 
                ? "Esta es una representación del diploma oficial que se otorga al finalizar el curso." 
                : `Has demostrado compromiso y disciplina al finalizar este programa en ${course?.technology}.`
              }
            </p>
          </section>
        </div>
      </main>

      <style jsx global>{`
        @media print {
          nav, footer, header, .print-hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .min-w-\[900px\] {
            min-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .flex-1 {
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
