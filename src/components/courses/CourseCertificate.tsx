'use client';

import React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Crown, ShieldCheck, Award, Calendar, CheckCircle2 } from 'lucide-react';

interface CourseCertificateProps {
  studentName: string;
  courseTitle: string;
  technology: string;
  isPremium: boolean;
  completionDate: string;
  modulesCount: number;
}

export function CourseCertificate({
  studentName,
  courseTitle,
  technology,
  isPremium,
  completionDate,
  modulesCount,
}: CourseCertificateProps) {
  // Direct links as requested
  const logoUrl = "https://dprogramadores.com.co/img/logoD.png";
  const signatureUrl = "https://drive.google.com/uc?export=view&id=1w2nzR-tylvAKiHe02fzdTKpRD7icoJua";
  const platformLogoUrl = "https://images.rawpixel.com/dark_image_png_800/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcm0zNzNiYXRjaDUtMTAucG5n.png";

  return (
    <div className="relative w-full max-w-4xl aspect-[1.414/1] bg-white border-[16px] border-slate-900 p-12 flex flex-col items-center justify-between text-center overflow-hidden shadow-2xl">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2 opacity-30" />
      
      {/* Academic Border Inset */}
      <div className="absolute inset-4 border-2 border-slate-200 pointer-events-none" />

      {/* Header with Logos */}
      <header className="relative z-10 w-full flex items-center justify-between px-8">
        <div className="relative w-20 h-20">
          <Image 
            src={logoUrl} 
            alt="DProgramadores Logo" 
            fill 
            className="object-contain" 
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-3xl font-headline font-bold tracking-tighter text-slate-900 uppercase">
            DProgramadores Academy
          </h1>
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
            Excelencia en Tecnología
          </p>
        </div>
        <div className="relative w-20 h-20 opacity-80">
          <Image 
            src={platformLogoUrl} 
            alt="LearnStream Logo" 
            fill 
            className="object-contain" 
          />
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 flex flex-col items-center gap-6 py-4">
        <div className="space-y-2">
          <p className="text-lg italic font-serif text-slate-600">Este diploma certifica que</p>
          <h2 className="text-5xl font-headline font-bold text-primary px-8 border-b-2 border-slate-100 pb-2">
            {studentName}
          </h2>
        </div>

        <div className="max-w-2xl space-y-4">
          <p className="text-lg leading-relaxed text-slate-700">
            Ha completado satisfactoriamente el programa de formación profesional en:
          </p>
          <div className="space-y-2">
            <h3 className="text-3xl font-headline font-bold text-slate-900">
              {courseTitle}
            </h3>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-bold px-3">
                Tecnología: {technology}
              </Badge>
              {isPremium ? (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold px-3 gap-1">
                  <Crown className="h-3 w-3" /> Nivel Profesional Premium
                </Badge>
              ) : (
                <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold px-3">
                  Nivel Fundamental
                </Badge>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500 max-w-xl">
          {isPremium 
            ? `Certificación avanzada otorgada por LearnStream que valida el dominio de arquitecturas complejas y conceptos premium tras completar ${modulesCount} módulos académicos.`
            : `Certificación básica que valida el conocimiento de los conceptos esenciales del programa de estudio en la plataforma LearnStream.`
          }
        </p>
      </main>

      {/* Footer with Signature and Security */}
      <footer className="relative z-10 w-full grid grid-cols-3 items-end pt-4">
        <div className="flex flex-col items-start gap-2 text-left">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
            <Calendar className="h-3 w-3" />
            Emisión: {completionDate}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
            <Award className="h-3 w-3" />
            ID: LS-{Math.random().toString(36).substring(7).toUpperCase()}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 border-t border-slate-200 pt-4">
          <div className="relative w-40 h-12">
            <Image 
              src={signatureUrl} 
              alt="Firma Director" 
              fill 
              className="object-contain" 
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">Daniel Morales</p>
            <p className="text-[10px] font-medium text-slate-500 uppercase">Director Académico</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="bg-slate-900 p-3 rounded-xl text-white flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <div className="text-left">
              <p className="text-[8px] font-bold opacity-70 uppercase">LearnStream</p>
              <p className="text-[10px] font-bold whitespace-nowrap">Verificado</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Security Watermark */}
      <div className="absolute bottom-10 left-10 pointer-events-none opacity-[0.03] rotate-[-25deg]">
        <Award className="w-96 h-96" />
      </div>
    </div>
  );
}
