import { initializeApp, getApps, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const apps = getApps();
let adminApp: App;

if (apps.length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 
                    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
                    'devforge-academy';
  
  try {
    adminApp = initializeApp({
      credential: applicationDefault(),
      projectId: projectId,
    });
  } catch (error) {
    console.warn('Initialization with applicationDefault() failed. Falling back to explicit projectId initialization...');
    adminApp = initializeApp({
      projectId: projectId,
    });
  }
} else {
  adminApp = apps[0];
}

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
