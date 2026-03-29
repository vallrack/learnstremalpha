'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It uses the toast system to notify the user instead of hard-crashing the application.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // 1. Si no hay usuario logueado, los errores de permiso son esperados en fondos (ej: progreso)
      // No queremos asustar al visitante con alertas de seguridad rojas.
      if (!user && !isUserLoading) return;

      // 2. Ignorar rutas no críticas o esperadas.
      const ignoredPaths = ['notifications', 'notifications-query', 'courseProgress', 'lesson_discussions', 'reviews'];
      const errorPath = error.request?.path || '';
      
      if (ignoredPaths.some(p => errorPath.includes(p))) {
        console.warn('Suppressed non-critical permission error:', errorPath);
        return;
      }
      
      console.error("FirebasePermissionError Catched:", error);
      
      // Notify the user without crashing the app
      toast({
        variant: "destructive",
        title: "Acceso Denegado (Seguridad)",
        description: "No tienes permisos suficientes para ver o modificar este recurso.",
      });
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  // This component renders nothing but listens to events.
  return null;
}
