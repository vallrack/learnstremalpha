
'use client';

import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutos

export function InactivityLogout() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (user && !user.isAnonymous) {
      timeoutRef.current = setTimeout(logoutUser, INACTIVITY_LIMIT);
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Sesión cerrada",
        description: "Se ha cerrado tu sesión por inactividad para proteger tu cuenta.",
      });
      router.push('/login');
    } catch (error) {
      console.error("Error signing out after inactivity", error);
    }
  };

  useEffect(() => {
    if (!user || user.isAnonymous) return;

    // Eventos que reinician el contador
    const events = [
      'mousedown', 
      'mousemove', 
      'keypress', 
      'scroll', 
      'touchstart'
    ];

    const handleUserInteraction = () => {
      resetTimer();
    };

    // Inicializar el timer
    resetTimer();

    // Agregar listeners
    events.forEach(event => {
      window.addEventListener(event, handleUserInteraction);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [user, auth, router]);

  return null;
}
