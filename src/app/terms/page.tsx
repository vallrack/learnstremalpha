'use client';

import { Navbar } from '@/components/layout/Navbar';
import { useBrand } from '@/lib/branding/BrandingProvider';

export default function TermsPage() {
  const { name } = useBrand();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-16 shadow-xl border border-slate-100 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-headline font-black text-slate-900">Términos y Condiciones de Uso</h1>
            <p className="text-sm text-slate-400 font-medium">Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div className="prose prose-slate max-w-none text-slate-600 space-y-6 leading-relaxed">
            <p>
              Bienvenido a <strong>{name}</strong>. Al acceder y utilizar nuestra plataforma de aprendizaje, aceptas estar sujeto a los siguientes términos y condiciones de uso. Por favor, léelos detenidamente antes de utilizar nuestros servicios.
            </p>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">1. Aceptación de los Términos</h2>
            <p>
              Al registrarte o utilizar {name}, declaras ser mayor de edad o contar con el consentimiento de tus padres o tutores legales, y aceptas cumplir con todas las leyes y regulaciones aplicables. Si no estás de acuerdo con estos términos, no podrás acceder ni utilizar la plataforma.
            </p>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">2. Cuentas de Usuario y Seguridad</h2>
            <p>
              Para acceder a ciertas funciones de la plataforma, debes registrarte y crear una cuenta. Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de todas las actividades que ocurran bajo tu cuenta. Te comprometes a notificarnos de inmediato cualquier uso no autorizado o brecha de seguridad.
            </p>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">3. Propiedad Intelectual</h2>
            <p>
              Todo el contenido disponible en {name}, incluyendo pero no limitado a cursos, videos, retos, código, texto, gráficos, logotipos, imágenes y software, es propiedad intelectual exclusiva de {name} o de sus respectivos creadores/instructores, y está protegido por las leyes de derechos de autor nacionales e internacionales.
            </p>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">4. Políticas de Pago y Reembolso</h2>
            <p>
              El acceso a cursos Premium, membresías o suscripciones requiere el pago de las tarifas vigentes. Todos los pagos se procesan a través de pasarelas de pago seguras y autorizadas (como ePayco). A menos que se indique lo contrario por ley, las compras digitales y activaciones de licencias son finales y no reembolsables.
            </p>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">5. Conducta y Uso Prohibido</h2>
            <p>
              Te comprometes a utilizar la plataforma únicamente con fines educativos y de forma ética. Queda estrictamente prohibido:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Compartir el acceso a tu cuenta con terceros.</li>
              <li>Intentar extraer el código fuente o videos de la plataforma.</li>
              <li>Utilizar herramientas automatizadas para raspar (scrape) datos de {name}.</li>
              <li>Publicar comentarios ofensivos, de odio o spam en los foros de discusión.</li>
            </ul>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">6. Modificaciones a los Términos</h2>
            <p>
              Nos reservamos el derecho de modificar o actualizar estos Términos y Condiciones en cualquier momento. Te notificaremos sobre cambios significativos publicando un aviso en la plataforma o mediante correo electrónico. El uso continuo de {name} tras la publicación de cambios constituye la aceptación de los mismos.
            </p>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">7. Contacto</h2>
            <p>
              Si tienes preguntas o inquietudes sobre estos Términos de Uso, puedes ponerte en contacto con nosotros a través de nuestro correo oficial de soporte: <a href="mailto:vallrack67@gmail.com" className="text-primary hover:underline font-bold">vallrack67@gmail.com</a>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
