'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrandingConfig, DEFAULT_BRANDING, TENANTS_MAP } from './branding-config';

const BrandingContext = createContext<BrandingConfig>(DEFAULT_BRANDING);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<BrandingConfig>(DEFAULT_BRANDING);

  useEffect(() => {
    // Multi-tenancy logic (Option B)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // Primero intentamos match exacto, luego por pedazo de dominio
      const tenantKey = Object.keys(TENANTS_MAP).find(key => hostname.includes(key));
      
      const activeBrand = tenantKey && Object.keys(TENANTS_MAP[tenantKey]).length > 0
        ? { ...DEFAULT_BRANDING, ...TENANTS_MAP[tenantKey] }
        : DEFAULT_BRANDING;

      setBrand(activeBrand);

      // Aplicar color primario dinámico si existe
      if (activeBrand.primaryColor) {
        document.documentElement.style.setProperty('--primary', activeBrand.primaryColor);
        document.documentElement.style.setProperty('--ring', activeBrand.primaryColor);
      }
    }
  }, []);

  return (
    <BrandingContext.Provider value={brand}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandingProvider');
  }
  return context;
}
