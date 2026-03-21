'use client';

import { DocumentReference, onSnapshot, DocumentData, FirestoreError, DocumentSnapshot } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import useSWRSubscription from 'swr/subscription';

export type WithId<T> = T & { id: string };

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  const SWR_KEY = memoizedDocRef ? memoizedDocRef.path : null;

  const { data, error } = useSWRSubscription<WithId<T> | null, FirestoreError | Error>(
    SWR_KEY,
    (key: any, { next }: any) => {
      if (!memoizedDocRef) return () => {};
      
      const unsubscribe = onSnapshot(
        memoizedDocRef,
        (snapshot: DocumentSnapshot<DocumentData>) => {
          if (snapshot.exists()) {
            next(null, { ...(snapshot.data() as T), id: snapshot.id });
          } else {
            next(null, null);
          }
        },
        (error: FirestoreError) => {
          const contextualError = new FirestorePermissionError({
            operation: 'get',
            path: memoizedDocRef.path,
          });
          errorEmitter.emit('permission-error', contextualError);
          next(contextualError, undefined);
        }
      );
      
      return () => unsubscribe();
    }
  );

  return {
    data: data === undefined ? null : data,
    isLoading: data === undefined && error === undefined && !!memoizedDocRef,
    error: error || null,
  };
}