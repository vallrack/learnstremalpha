import { initializeApp, getApps, applicationDefault, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const apps = getApps();
let adminApp: App;

if (apps.length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 
                    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  if (!projectId) {
    console.error("FIREBASE_PROJECT_ID is not defined. Firebase Admin initialization may fail.");
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId,
      });
    } catch (error) {
       console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", error);
       adminApp = initializeApp({ projectId });
    }
  } else if (clientEmail && privateKey) {
    adminApp = initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      projectId: projectId,
    });
  } else {
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
  }

} else {
  adminApp = apps[0];
}

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
