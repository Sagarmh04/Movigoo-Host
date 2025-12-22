// Firebase Admin SDK initialization for server-side operations
// Note: This requires Firebase Admin service account credentials
// For production, set up GOOGLE_APPLICATION_CREDENTIALS environment variable
// or use Firebase Admin SDK initialization with credentials

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

export function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // Check if Firebase Admin is already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  // Try to initialize with service account credentials
  // This will work if GOOGLE_APPLICATION_CREDENTIALS is set or credentials are provided
  try {
    // For Vercel/serverless, credentials might be in environment variables as JSON
    if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
      const credentials = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      adminApp = initializeApp({
        credential: cert(credentials),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      // Try default credentials (works if GOOGLE_APPLICATION_CREDENTIALS is set)
      adminApp = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  } catch (error) {
    console.warn("Firebase Admin initialization failed. Some features may not work:", error);
    // Return a mock app - API routes will handle this gracefully
    throw new Error("Firebase Admin SDK not configured. Please set up service account credentials.");
  }

  return adminApp;
}

export function getAdminDb(): Firestore {
  if (adminDb) {
    return adminDb;
  }

  const app = getAdminApp();
  adminDb = getFirestore(app);
  return adminDb;
}

export function getAdminAuth(): Auth {
  if (adminAuth) {
    return adminAuth;
  }

  const app = getAdminApp();
  adminAuth = getAuth(app);
  return adminAuth;
}

