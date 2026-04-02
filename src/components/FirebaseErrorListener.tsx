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
      // 1. Si no hay usuario logueado en este momento exacto, ignoramos.
      // Usamos el "user" reactivo pero también validamos si el componente ya detectó el cambio.
      if (!user && !isUserLoading) return;

      // 2. Ignorar rutas no críticas o esperadas durante transiciones.
      const ignoredPaths = [
        'notifications', 
        'notifications-query', 
        'courseProgress', 
        'lesson_discussions', 
        'reviews', 
        'podcasts', 
        'podcast_comments'
      ];
      // 3. Silenciar durante el logout activo (algunos listeners tardan en cerrarse)
      if (typeof window !== 'undefined' && localStorage.getItem('ls_logging_out') === 'true') {
        return;
      }
      
      const errorPath = error.request?.path || '';
      
      if (ignoredPaths.some(p => errorPath.includes(p))) {
        console.warn('Suppressed non-critical permission error:', errorPath);
        return;
      }
      
      console.error("FirebasePermissionError Captured:", error);
      
      // Solo mostramos el toast si realmente creemos que el usuario debería tener acceso
      // y no está en medio de un logout.
      toast({
        variant: "destructive",
        title: "Acceso Restringido",
        description: "No tienes permisos para realizar esta acción o ver este recurso.",
      });
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast, user, isUserLoading]);

  // This component renders nothing but listens to events.
  return null;
}
