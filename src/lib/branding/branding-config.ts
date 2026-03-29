export interface BrandingConfig {
  name: string;
  tagline: string;
  logoUrl: string;
  supportEmail: string;
  supportWhatsapp: string;
  primaryColor?: string;
  domain?: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'LearnStream',
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE || 'Academia Digital Moderna',
  logoUrl: process.env.NEXT_PUBLIC_APP_LOGO || 'https://drive.google.com/uc?export=view&id=16eSjcZhzvz1dGapFrNVFXSQ_kG4dyg0i',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'ventas@learnstream.com',
  supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '573054694239',
  domain: process.env.NEXT_PUBLIC_APP_DOMAIN || 'learnstream.app',
};

// Mapa para multi-tenencia (Opción B)
// En producción, esto se podría cargar desde Firestore
export const TENANTS_MAP: Record<string, Partial<BrandingConfig>> = {
  'localhost': {}, // Usa los defaults
  'learnstream.app': {},
  'academia-demo.learnstream.app': {
    name: 'Academia Demo',
    tagline: 'Tu centro de formación especializado',
    logoUrl: 'https://drive.google.com/uc?export=view&id=16eSjcZhzvz1dGapFrNVFXSQ_kG4dyg0i', // Cambiar por el logo del cliente
  },
  'dprogramadores.com.co': {
    name: 'DProgramadores Academy',
    tagline: 'La vida en un código',
    logoUrl: 'https://dprogramadores.com.co/img/logoD.png',
    primaryColor: '210 100% 50%',
  }
};
