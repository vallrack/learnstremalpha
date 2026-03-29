'use client';

import { Query, onSnapshot, DocumentData, FirestoreError, QuerySnapshot, CollectionReference } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import useSWRSubscription from 'swr/subscription';

type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export interface InternalQuery extends Query<DocumentData> {
  _query: { path: { canonicalString(): string; toString(): string; } }
}

export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  
  // Utiliza el path de la collección como SWR_KEY principal para cache. Si es una query con filtros,
  // se adosa un flag `-query` para separarla de la colección general en cache.
  const SWR_KEY = memoizedTargetRefOrQuery ? 
    (memoizedTargetRefOrQuery.type === 'collection'
          ? (memoizedTargetRefOrQuery as CollectionReference).path
          : (memoizedTargetRefOrQuery as any)?._query?.path?.canonicalString() + '-query') : null;

  const { data, error } = useSWRSubscription<WithId<T>[], FirestoreError | Error>(
    SWR_KEY,
    (key: any, { next }: any) => {
      if (!memoizedTargetRefOrQuery) return () => {};

      if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
        console.error(memoizedTargetRefOrQuery + ' was not properly memoized using useMemoFirebase');
      }

      const unsubscribe = onSnapshot(
        memoizedTargetRefOrQuery,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const results: WithId<T>[] = [];
          for (const doc of snapshot.docs) {
            results.push({ ...(doc.data() as T), id: doc.id });
          }
          next(null, results);
        },
        (error: FirestoreError) => {
          if (error.code === 'permission-denied') {
            const contextualError = new FirestorePermissionError({
              operation: 'list',
              path: memoizedTargetRefOrQuery?.type === 'collection' 
                ? (memoizedTargetRefOrQuery as CollectionReference).path 
                : ((memoizedTargetRefOrQuery as any)?._query?.path?.canonicalString() || 'unknown-query'),
            });
            errorEmitter.emit('permission-error', contextualError);
            next(contextualError, undefined);
          } else {
            console.error('Firestore Error in useCollection:', error.message);
            next(error, undefined);
          }
        }
      );
      
      return () => unsubscribe();
    }
  );

  return { 
    data: data === undefined ? null : data, 
    isLoading: data === undefined && error === undefined && !!memoizedTargetRefOrQuery, 
    error: error || null 
  };
}