'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { useBrand } from '@/lib/branding/BrandingProvider';
import { doc, setDoc } from 'firebase/firestore';
import { Save, Globe, Palette, Mail, MessageCircle, Link, Loader2, PlayCircle, CreditCard, Calendar, ShieldCheck, AlertTriangle, Zap, CheckCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      
      const dataToSave: any = {
        name: formData.name,
        tagline: formData.tagline,
        logoUrl: formData.logoUrl,
        primaryColor: formData.primaryColor,
        supportEmail: formData.supportEmail,
        supportWhatsapp: formData.supportWhatsapp,
        domain: formData.domain,
        isDemoEnabled: formData.isDemoEnabled,
        demoExpiration: formData.demoExpiration,
        academyCurrency: formData.academyCurrency,
        epaycoMerchantId: formData.epaycoMerchantId,
        isEpaycoTestMode: formData.isEpaycoTestMode,
        epaycoDocsStatus: formData.epaycoDocsStatus,
      };

      if (formData.academyMonthlyPrice !== undefined) dataToSave.academyMonthlyPrice = Number(formData.academyMonthlyPrice);
      if (formData.academyAnnualPrice !== undefined) dataToSave.academyAnnualPrice = Number(formData.academyAnnualPrice);

      // Clean undefined keys
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined) {
          delete dataToSave[key];
        }
      });

      await setDoc(settingsRef, dataToSave, { merge: true });
      
      toast({
        title: "¡Cambios guardados!",
        description: "La identidad de tu academia ha sido actualizada globalmente.",
      });
    } catch (error) {
      console.error("DEBUG: Error saving academy settings", error);
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

           {/* Demo Section */}
           <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white mt-8">
             <CardHeader className="bg-slate-50/50 border-b p-8">
               <CardTitle className="flex items-center gap-2 text-xl">
                 <PlayCircle className="h-6 w-6 text-amber-500" />
                 Acceso Demo Público
               </CardTitle>
               <CardDescription>Controla la visibilidad del botón de demo en la web.</CardDescription>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                   <div className="space-y-1">
                      <p className="font-bold text-amber-900 text-lg">Habilitar Botón de Demo</p>
                      <p className="text-sm text-amber-700">Permite que cualquiera pruebe el sistema como instructor.</p>
                   </div>
                   <Switch 
                     checked={formData.isDemoEnabled} 
                     onCheckedChange={checked => setFormData({...formData, isDemoEnabled: checked})} 
                   />
                </div>

                <div className="space-y-2">
                   <Label className="font-bold text-slate-700 ml-1 flex items-center gap-2">
                     <Calendar className="h-4 w-4 text-slate-400" /> Fecha de Cierre del Demo
                   </Label>
                   <Input 
                     type="date"
                     value={formData.demoExpiration || ''} 
                     onChange={e => setFormData({...formData, demoExpiration: e.target.value})}
                     className="rounded-2xl h-12 bg-slate-50 border-none shadow-none max-w-xs"
                   />
                   <p className="text-[10px] text-slate-400 font-medium ml-1 uppercase tracking-wider">Después de esta fecha el botón se ocultará automáticamente.</p>
                </div>
             </CardContent>
           </Card>

           {/* Pricing Section */}
           <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white mt-8">
             <CardHeader className="bg-slate-50/50 border-b p-8">
               <CardTitle className="flex items-center gap-2 text-xl">
                 <CreditCard className="h-6 w-6 text-indigo-500" />
                 Planes para Academias
               </CardTitle>
               <CardDescription>Define los costos de suscripción para las instituciones interesadas.</CardDescription>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 ml-1">Moneda de Cobro</Label>
                    <Select 
                      value={formData.academyCurrency || 'COP'} 
                      onValueChange={val => setFormData({...formData, academyCurrency: val})}
                    >
                      <SelectTrigger className="rounded-2xl h-12 bg-slate-50 border-none shadow-none text-lg font-bold">
                        <SelectValue placeholder="COP" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                   <div className="space-y-2">
                     <Label className="font-bold text-slate-700 ml-1">Costo Mensual</Label>
                     <Input 
                       type="number"
                       value={formData.academyMonthlyPrice || 0} 
                       onChange={e => setFormData({...formData, academyMonthlyPrice: Number(e.target.value)})}
                       className="rounded-2xl h-12 bg-slate-50 border-none shadow-none text-xl font-bold"
                       placeholder="Ej: 299000"
                     />
                   </div>
                   <div className="space-y-2">
                     <Label className="font-bold text-slate-700 ml-1">Costo Anual</Label>
                     <Input 
                       type="number"
                       value={formData.academyAnnualPrice || 0} 
                       onChange={e => setFormData({...formData, academyAnnualPrice: Number(e.target.value)})}
                       className="rounded-2xl h-12 bg-slate-50 border-none shadow-none text-xl font-bold"
                       placeholder="Ej: 2490000"
                     />
                   </div>
                </div>
             </CardContent>
           </Card>

           {/* Gateway Section */}
           <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white mt-8 border-2 border-indigo-100">
             <CardHeader className="bg-indigo-50/30 border-b p-8">
               <CardTitle className="flex items-center gap-2 text-xl text-indigo-900">
                 <ShieldCheck className="h-6 w-6 text-indigo-500" />
                 Pasarela de Pagos (ePayco)
               </CardTitle>
               <CardDescription>Configura los identificadores de tu cuenta para recibir el dinero de la plataforma.</CardDescription>
             </CardHeader>
             <CardContent className="p-8 space-y-6">
                <div className="bg-amber-50 p-6 rounded-[1.5rem] border border-amber-200 flex gap-4 items-start">
                  <div className="bg-amber-100 p-2 rounded-xl h-fit"><AlertTriangle className="h-5 w-5 text-amber-700" /></div>
                  <div className="text-sm text-amber-900 space-y-1">
                    <p className="font-bold">Nota sobre el destino de los fondos</p>
                    <p>Si un curso o actividad es administrativa (no pertenece a un instructor externo), el 100% de la venta se enviará al ID de comercio que configures debajo.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 ml-1">ID de Comercio (Merchant ID) de la Academia</Label>
                  <Input 
                    value={formData.epaycoMerchantId || ''} 
                    onChange={e => setFormData({...formData, epaycoMerchantId: e.target.value})}
                    className="rounded-2xl h-12 bg-slate-50 border-none shadow-none text-lg font-mono"
                    placeholder="Ej: 510XXX"
                  />
                  <p className="text-[10px] text-slate-400 font-medium ml-1 uppercase tracking-wider">Lo encuentras en tu panel de ePayco en Configuración > Propiedades.</p>
                </div>

                <div className="flex items-center justify-between p-6 bg-slate-900 rounded-[2rem] text-white">
                   <div className="space-y-1">
                      <p className="font-bold text-lg flex items-center gap-2">
                        < Zap className={`h-5 w-5 ${formData.isEpaycoTestMode ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                        Modo de Pruebas de Pasarela
                      </p>
                      <p className="text-xs text-slate-400">Actívalo para realizar compras ficticias con tarjetas de prueba ePayco.</p>
                   </div>
                   <Switch 
                     checked={!!formData.isEpaycoTestMode} 
                     onCheckedChange={checked => setFormData({...formData, isEpaycoTestMode: checked})}
                     className="data-[state=checked]:bg-amber-500"
                   />
                </div>

                <div className="space-y-4 pt-4 border-t border-indigo-50">
                   <Label className="font-bold text-slate-700 ml-1 flex items-center gap-2">
                      Estado de Validación en ePayco <span className="text-[10px] text-slate-400 font-normal">(Recordatorio Interno)</span>
                   </Label>
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: 'rut', label: 'RUT' },
                        { id: 'bank', label: 'Cert. Bancario' },
                        { id: 'id', label: 'Cédula/ID' },
                        { id: 'camara', label: 'Cámara Com.' }
                      ].map(doc => (
                        <Button 
                          key={doc.id}
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const current = formData.epaycoDocsStatus || {};
                            setFormData({
                              ...formData, 
                              epaycoDocsStatus: { ...current, [doc.id]: !current[doc.id] }
                            });
                          }}
                          className={`rounded-xl h-12 text-xs font-bold transition-all ${
                            formData.epaycoDocsStatus?.[doc.id] 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-inner' 
                              : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                          }`}
                        >
                          {formData.epaycoDocsStatus?.[doc.id] ? <CheckCheck className="h-4 w-4 mr-2" /> : null}
                          {doc.label}
                        </Button>
                      ))}
                   </div>
                   <p className="text-[10px] text-slate-400 text-center font-medium uppercase tracking-widest">Marca los documentos que ePayco ya te aprobó al 100%.</p>
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
