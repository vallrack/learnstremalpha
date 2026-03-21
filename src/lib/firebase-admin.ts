import { initializeApp, getApps, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const apps = getApps();
let adminApp: App;

if (apps.length === 0) {
  try {
    adminApp = initializeApp({
      credential: applicationDefault(),
    });
  } catch (error) {
    console.warn('Initialization with applicationDefault() failed. Falling back to default initialization without credentials (might fail on read/write if not authenticated locally).');
    adminApp = initializeApp();
  }
} else {
  adminApp = apps[0];
}

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
