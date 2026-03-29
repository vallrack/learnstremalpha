'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useBrand } from '@/lib/branding/BrandingProvider';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Save, Globe, Palette, Mail, MessageCircle, Link, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AcademySettings() {
  const brand = useBrand();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState(brand);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (brand) {
      setFormData(brand);
    }
  }, [brand]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    
    setIsSaving(true);
    try {
      const settingsRef = doc(db, 'settings', 'branding');
      await setDocumentNonBlocking(settingsRef, {
        name: formData.name,
        tagline: formData.tagline,
        logoUrl: formData.logoUrl,
        primaryColor: formData.primaryColor,
        supportEmail: formData.supportEmail,
        supportWhatsapp: formData.supportWhatsapp,
        domain: formData.domain
      }, { merge: true });
      
      toast({
        title: "¡Cambios guardados!",
        description: "La identidad de tu academia ha sido actualizada globalmente.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudieron aplicar los cambios en este momento.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-4xl font-headline font-bold text-slate-900">Configuración de Academia</h1>
          <p className="text-slate-500 mt-2 text-lg">Personaliza la identidad visual y de contacto de tu plataforma.</p>
        </header>

        <form onSubmit={handleSave} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {/* Visual Section */}
           <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
             <CardHeader className="bg-slate-50/50 border-b p-8">
               <CardTitle className="flex items-center gap-2 text-xl">
                 <Palette className="h-6 w-6 text-primary" />
                 Identidad Visual
               </CardTitle>
               <CardDescription>Configura cómo los estudiantes perciben tu marca.</CardDescription>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 ml-1">Nombre de la Academia</Label>
                    <Input 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="rounded-2xl h-12 bg-slate-50 border-none shadow-none focus-visible:ring-primary text-lg font-medium"
                      placeholder="Ej: LearnStream"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 ml-1">Color Primario (HSL)</Label>
                    <div className="flex gap-3">
                      <Input 
                        value={formData.primaryColor} 
                        onChange={e => setFormData({...formData, primaryColor: e.target.value})}
                        placeholder="Ej: 250 70% 50%"
                        className="rounded-2xl h-12 bg-slate-50 border-none shadow-none focus-visible:ring-primary font-mono"
                      />
                      <div 
                        className="w-12 h-12 rounded-2xl border-2 border-slate-100 shadow-inner" 
                        style={{ backgroundColor: `hsl(${formData.primaryColor})` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium ml-1 uppercase tracking-wider">Usa formato HSL para compatibilidad total con Tailwind.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 ml-1">Eslogan / Frase Hero</Label>
                  <Input 
                    value={formData.tagline} 
                    onChange={e => setFormData({...formData, tagline: e.target.value})}
                    className="rounded-2xl h-12 bg-slate-50 border-none shadow-none"
                    placeholder="Ej: Academia Digital Moderna"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 ml-1">URL del Logo Principal</Label>
                  <div className="flex gap-6 items-center">
                    <Input 
                      value={formData.logoUrl} 
                      onChange={e => setFormData({...formData, logoUrl: e.target.value})}
                      className="rounded-2xl h-12 bg-slate-50 border-none shadow-none flex-1 font-mono text-xs"
                      placeholder="https://drive.google.com/..."
                    />
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center p-3 relative overflow-hidden group">
                       <img src={formData.logoUrl} alt="Preview" className="max-h-full object-contain transition-transform group-hover:scale-110" />
                    </div>
                  </div>
                </div>
             </CardContent>
           </Card>

           {/* Contact Section */}
           <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
             <CardHeader className="bg-slate-50/50 border-b p-8">
               <CardTitle className="flex items-center gap-2 text-xl">
                 <Globe className="h-6 w-6 text-emerald-500" />
                 Contacto y Presencia
               </CardTitle>
               <CardDescription>Define los canales donde atenderás a tus alumnos.</CardDescription>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 ml-1 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" /> Correo de Soporte
                    </Label>
                    <Input 
                      value={formData.supportEmail} 
                      onChange={e => setFormData({...formData, supportEmail: e.target.value})}
                      className="rounded-2xl h-12 bg-slate-50 border-none shadow-none"
                      placeholder="notificaciones@tudominio.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 ml-1 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-emerald-500" /> WhatsApp (Internacional)
                    </Label>
                    <Input 
                      value={formData.supportWhatsapp} 
                      onChange={e => setFormData({...formData, supportWhatsapp: e.target.value})}
                      className="rounded-2xl h-12 bg-slate-50 border-none shadow-none"
                      placeholder="Ej: 57305XXXXXXX"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 ml-1 flex items-center gap-2">
                    <Link className="h-4 w-4 text-slate-400" /> Dominio Oficial App
                  </Label>
                  <Input 
                    value={formData.domain} 
                    onChange={e => setFormData({...formData, domain: e.target.value})}
                    className="rounded-2xl h-12 bg-slate-50 border-none shadow-none"
                    placeholder="tudominio.com"
                  />
                </div>
             </CardContent>
           </Card>

           <div className="flex justify-end pt-4 pb-12">
              <Button 
                type="submit" 
                size="lg" 
                className="rounded-2xl px-16 h-16 font-bold gap-3 text-xl shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                Guardar Identidad
              </Button>
           </div>
        </form>
      </main>
    </div>
  );
}
