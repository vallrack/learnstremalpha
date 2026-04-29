'use client';

import React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Crown, ShieldCheck, Award, Calendar, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useBrand } from '@/lib/branding/BrandingProvider';

interface CourseCertificateProps {
  studentName: string;
  courseTitle: string;
  technology: string;
  isPremium: boolean;
  completionDate: string;
  modulesCount: number;
  instructorName?: string;
  certificateId?: string;
}

export function CourseCertificate({
  studentName,
  courseTitle,
  technology,
  isPremium,
  completionDate,
  modulesCount,
  instructorName,
  certificateId = "PREVIEW-ID",
}: CourseCertificateProps) {
  const dpLogoUrl = "https://dprogramadores.com.co/img/logoD.png";
  const signatureUrl = "https://drive.google.com/uc?export=view&id=1w2nzR-tylvAKiHe02fzdTKpRD7icoJua";
  const { name, logoUrl: platformLogoUrl, domain } = useBrand();
  const effectiveInstructorName = instructorName || `Experto ${name}`;

  const verifyUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/verify/${certificateId}`
    : `https://${domain}/verify/${certificateId}`;

  return (
    <>
      <div className="certificate-container relative w-full max-w-4xl aspect-[1.414/1] bg-white border-[12px] border-slate-900 p-8 flex flex-col items-center justify-between text-center overflow-hidden shadow-2xl">
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 print-element" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2 opacity-30 print-element" />
        
        {/* Marco académico interno */}
        <div className="absolute inset-2 border border-slate-200 pointer-events-none print-element" />

        {/* Cabecera con Logos y Título */}
        <header className="relative z-10 w-full flex items-center justify-between px-6 pt-2">
          {/* USAMOS next/image SIN unoptimized para que el proxy de Next maneje el CORS, 
              pero CON priority para que no use lazy loading en impresión */}
          <div className="relative w-16 h-16 print-image-container">
            <Image 
              src={dpLogoUrl} 
              alt="DProgramadores Logo" 
              fill 
              priority
              className="object-contain" 
            />
          </div>
          
          <div className="flex flex-col items-center gap-0.5">
            <h1 className="text-2xl font-headline font-bold tracking-tight text-slate-900 uppercase">
              DProgramadores Academy
            </h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.25em]">
              La vida en un código
            </p>
          </div>

          <div className="relative w-24 h-24 flex items-center justify-center print-image-container">
            <Image 
              src={platformLogoUrl} 
              alt={`${name} Logo`} 
              fill 
              priority
              className="object-contain" 
            />
          </div>
        </header>

        {/* Cuerpo Principal del Certificado */}
        <main className="relative z-10 flex flex-col items-center gap-2 py-2">
          <div className="space-y-1">
            <p className="text-sm italic font-serif text-slate-500">Este diploma certifica que</p>
            <h2 className="text-4xl font-headline font-bold text-primary px-6 border-b border-slate-100 pb-1">
              {studentName}
            </h2>
          </div>

          <div className="max-w-xl space-y-2">
            <p className="text-sm leading-relaxed text-slate-600">
              Ha completado satisfactoriamente el programa de formación profesional en:
            </p>
            <div className="space-y-1">
              <h3 className="text-2xl font-headline font-bold text-slate-900 leading-tight">
                {courseTitle}
              </h3>
              <div className="flex items-center justify-center gap-2">
                 <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-bold px-2 py-0 h-5 text-[10px] print-element">
                   Tecnología: {technology}
                 </Badge>
                 {isPremium ? (
                   <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold px-2 py-0 h-5 text-[10px] gap-1 print-element">
                     <Crown className="h-3 w-3" /> Nivel Profesional Premium
                   </Badge>
                 ) : (
                   <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold px-2 py-0 h-5 text-[10px] print-element">
                     Nivel Fundamental
                   </Badge>
                 )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100 print-element">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-600">Instructor a cargo: <span className="text-primary">{effectiveInstructorName}</span></span>
          </div>

          <p className="text-[10px] text-slate-400 max-w-lg leading-relaxed px-4">
            {isPremium 
              ? `Certificación avanzada otorgada por ${name} que valida el dominio de arquitecturas complejas y conceptos premium tras completar ${modulesCount} módulos académicos.`
              : `Certificación básica que valida el conocimiento de los conceptos esenciales del programa de estudio en la plataforma ${name}.`
            }
          </p>
        </main>

        {/* Pie de página con Firma y Seguridad */}
        <footer className="relative z-10 w-full grid grid-cols-3 items-end pb-4 px-6">
          <div className="flex flex-col items-start gap-1 text-left">
            <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 uppercase">
              <Calendar className="h-2.5 w-2.5" />
              Emisión: {completionDate}
            </div>
            <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 uppercase">
              <Award className="h-2.5 w-2.5" />
              ID: {certificateId}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 border-t border-slate-200 pt-2 print-element">
             <div className="relative w-32 h-10 print-image-container">
               <Image 
                 src={signatureUrl} 
                 alt="Firma Director" 
                 fill 
                 priority
                 className="object-contain" 
               />
             </div>
             <div className="text-center">
               <p className="text-xs font-bold text-slate-900">Daniel Morales</p>
               <p className="text-[9px] font-medium text-slate-500 uppercase tracking-wide">Director Académico</p>
             </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="bg-white p-1 rounded-sm border shadow-sm print-element">
              <QRCodeSVG value={verifyUrl} size={64} level="Q" />
            </div>
            <div className="bg-slate-900 px-2 py-1 rounded w-[72px] text-center text-white flex flex-col items-center justify-center print-element">
              <ShieldCheck className="h-3 w-3 text-emerald-400 mb-0.5" />
              <p className="text-[5px] font-bold uppercase leading-none">Escanear para verificar</p>
            </div>
          </div>
        </footer>

        {/* Marca de agua de seguridad */}
        <div className="absolute bottom-6 left-6 pointer-events-none opacity-[0.02] rotate-[-20deg]">
          <Award className="w-64 h-64" />
        </div>
      </div>
      
      <style jsx>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          .certificate-container {
            box-shadow: none !important;
            border-width: 12px !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-element {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}
