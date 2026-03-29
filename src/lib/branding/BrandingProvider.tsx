'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrandingConfig, DEFAULT_BRANDING, TENANTS_MAP } from './branding-config';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const BrandingContext = createContext<BrandingConfig>(DEFAULT_BRANDING);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const db = useFirestore();

  useEffect(() => {
    if (!db) return;

    const settingsRef = doc(db, 'settings', 'branding');
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      // 1. Resolve domain branding (Option B)
      const hostname = window.location.hostname;
      const tenantKey = Object.keys(TENANTS_MAP).find(key => hostname.includes(key));
      const activeBrand = tenantKey && Object.keys(TENANTS_MAP[tenantKey]).length > 0
        ? { ...DEFAULT_BRANDING, ...TENANTS_MAP[tenantKey] }
        : DEFAULT_BRANDING;

      // 2. Resolve database brand (if exists)
      if (snapshot.exists()) {
        const data = snapshot.data();
        const finalBrand = {
          ...activeBrand,
          ...data
        };
        setBrand(finalBrand);

        // 3. Dynamic Styles
        if (finalBrand.primaryColor) {
           document.documentElement.style.setProperty('--primary', finalBrand.primaryColor);
           document.documentElement.style.setProperty('--ring', finalBrand.primaryColor);
        }
      } else {
        setBrand(activeBrand);
      }
    });

    return () => unsubscribe();
  }, [db]);

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
