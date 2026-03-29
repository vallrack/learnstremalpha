'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useBrand } from '@/lib/branding/BrandingProvider';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Check, ShieldCheck, Zap, Star, Building2, Mail, Phone, Users, Globe, Loader2, Sparkles, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function RegisterAcademy() {
  const brand = useBrand();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    academyName: '',
    studentCount: '',
    website: '',
    message: '',
    plan: 'monthly'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    
    setIsSubmitting(true);
    try {
      // Guardar la solicitud en Firestore (instructor_applications)
      // Usaremos un campo 'type' para diferenciar solicitudes de academias vs instructores indep.
      await addDoc(collection(db, 'instructor_applications'), {
        ...formData,
        type: 'academy',
        status: 'pending',
        createdAt: new Date(),
        userId: 'guest' 
      });
      
      setIsSuccess(true);
      toast({
        title: "¡Solicitud Enviada!",
        description: "Un consultor se pondrá en contacto contigo pronto.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error al enviar",
        description: "Hubo un problema. Por favor intenta de nuevo o contáctanos por WhatsApp.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-6 py-24 text-center">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                <Check className="h-12 w-12 text-emerald-600" />
            </div>
            <h1 className="text-5xl font-headline font-black text-slate-900 mb-6">¡Gracias por tu interés!</h1>
            <p className="text-xl text-slate-600 mb-12 leading-relaxed">
                Hemos recibido tu solicitud para formar parte de LearnStream como academia. 
                Un experto en educación digital revisará tu perfil y te contactará en las próximas 24 horas.
            </p>
            <Button size="lg" className="rounded-2xl px-12 h-14" onClick={() => router.push('/')}>
                Volver al Inicio
            </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Left Column: Info */}
          <div className="lg:col-span-5 space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-widest">
                <Building2 className="h-4 w-4" /> B2B Soluciones Educativas
              </div>
              <h1 className="text-5xl lg:text-7xl font-headline font-black text-slate-900 leading-[0.9]">
                Eleva tu <span className="text-primary italic">Academia</span> al siguiente nivel.
              </h1>
              <p className="text-xl text-slate-500 leading-relaxed max-w-md">
                LearnStream proporciona la tecnología, tú pones el conocimiento. Una alianza diseñada para escalar.
              </p>
            </div>

            <div className="space-y-8 pt-8">
               <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                     <ShieldCheck className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-900 text-lg">Marca Blanca e Identidad</h3>
                     <p className="text-slate-500">Personaliza colores, logo y dominio para que tus alumnos sientan tu marca.</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                     <Sparkles className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-900 text-lg">Inteligencia Artificial Pro</h3>
                     <p className="text-slate-500">Usa nuestros modelos de IA para generar retos H5P y evaluar código automáticamente.</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                     <Rocket className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-900 text-lg">Control Total de Usuarios</h3>
                     <p className="text-slate-500">Panel administrativo avanzado para gestionar inscripciones, pagos y métricas de éxito.</p>
                  </div>
               </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
               <div className="flex gap-2 mb-4">
                  {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
               </div>
               <p className="text-lg italic text-slate-300 mb-6 leading-relaxed">
                 "Migrar nuestra formación presencial a LearnStream ha sido la mejor decisión estratégica del año. La IA nos ahorra horas de calificación."
               </p>
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700" />
                  <div>
                     <p className="font-bold">Director Educativo</p>
                     <p className="text-xs text-slate-500 uppercase tracking-wider">Tech Academy LATAM</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-7">
            <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b p-10">
                <CardTitle className="text-3xl font-headline font-bold">Solicitud Premuim</CardTitle>
                <CardDescription className="text-lg">Completa estos datos para recibir una propuesta personalizada.</CardDescription>
              </CardHeader>
              <CardContent className="p-10">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="name" className="font-bold text-slate-700 ml-1">Tu Nombre Completo</Label>
                      <Input 
                        id="name"
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="rounded-2xl h-14 bg-slate-50 border-none shadow-none focus-visible:ring-primary text-lg"
                        placeholder="Ej: Juan Pérez"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="email" className="font-bold text-slate-700 ml-1">Correo Corporativo</Label>
                      <Input 
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="rounded-2xl h-14 bg-slate-50 border-none shadow-none focus-visible:ring-primary text-lg"
                        placeholder="juan@empresa.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="phone" className="font-bold text-slate-700 ml-1">WhatsApp de Contacto</Label>
                      <Input 
                        id="phone"
                        required
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="rounded-2xl h-14 bg-slate-50 border-none shadow-none focus-visible:ring-primary text-lg"
                        placeholder="+57 305..."
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="academyName" className="font-bold text-slate-700 ml-1">Nombre de la Institución</Label>
                      <Input 
                        id="academyName"
                        required
                        value={formData.academyName}
                        onChange={e => setFormData({...formData, academyName: e.target.value})}
                        className="rounded-2xl h-14 bg-slate-50 border-none shadow-none focus-visible:ring-primary text-lg"
                        placeholder="Academia XYZ"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="studentCount" className="font-bold text-slate-700 ml-1">Nro Estimado de Alumnos</Label>
                      <select 
                        id="studentCount"
                        value={formData.studentCount}
                        onChange={e => setFormData({...formData, studentCount: e.target.value})}
                        className="w-full rounded-2xl h-14 px-4 bg-slate-50 border-none shadow-none focus-visible:ring-primary text-lg outline-none appearance-none"
                      >
                        <option value="">Selecciona una opción</option>
                        <option value="1-50">1 - 50 estudiantes</option>
                        <option value="51-200">51 - 200 estudiantes</option>
                        <option value="201-500">201 - 500 estudiantes</option>
                        <option value="500+">Más de 500 estudiantes</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="website" className="font-bold text-slate-700 ml-1">Sitio Web (Opcional)</Label>
                      <Input 
                        id="website"
                        value={formData.website}
                        onChange={e => setFormData({...formData, website: e.target.value})}
                        className="rounded-2xl h-14 bg-slate-50 border-none shadow-none focus-visible:ring-primary text-lg"
                        placeholder="www.tuacademia.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="font-bold text-slate-700 ml-1">Interés de Pago</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        onClick={() => setFormData({...formData, plan: 'monthly'})}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.plan === 'monthly' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
                      >
                        <p className="font-bold">Mensual</p>
                        <p className="text-xs text-slate-500">Flexibilidad total</p>
                      </div>
                      <div 
                        onClick={() => setFormData({...formData, plan: 'annual'})}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.plan === 'annual' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'}`}
                      >
                        <p className="font-bold">Anual (B2B)</p>
                        <p className="text-xs text-slate-500">Pago único, mayor ahorro</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="message" className="font-bold text-slate-700 ml-1">Mensaje o Requerimientos Especiales</Label>
                    <Textarea 
                      id="message"
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                      className="rounded-2xl min-h-[120px] bg-slate-50 border-none shadow-none focus-visible:ring-primary text-lg p-4"
                      placeholder="Cuéntanos más sobre tus necesidades..."
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-16 rounded-[2rem] text-xl font-bold gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                  >
                    {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Rocket className="h-6 w-6" />}
                    Enviar Solicitud de Academia
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t py-12 px-6 bg-white">
        <div className="max-w-7xl mx-auto text-center text-slate-400 text-sm">
           © 2024 {brand.name}. Área B2B y Alianzas Educativas.
        </div>
      </footer>
    </div>
  );
}
