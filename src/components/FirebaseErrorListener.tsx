'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It uses the toast system to notify the user instead of hard-crashing the application.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Ignore permission errors on non-critical paths like notifications.
      const ignoredPaths = ['notifications', 'notifications-query'];
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
