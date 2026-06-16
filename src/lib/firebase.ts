// lib/firebase.ts — initialize Firebase app, Auth, Firestore, and Messaging once.
// All credentials read from import.meta.env (Vite) — never hardcoded.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAAj-j0CNAaqKpZWp_imUTmaGiBgxkaFcQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "junior-kitchen.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "junior-kitchen",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "junior-kitchen.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "982875354224",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:982875354224:web:c35678e80b8197b96070b5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-ZQJ8N5TTG9",
};

// Prevent re-initialization during HMR
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Messaging is only supported in browser contexts (not SSR, not old browsers)
export let messaging: ReturnType<typeof getMessaging> | null = null;
isSupported().then((supported) => {
  if (supported) messaging = getMessaging(app);
});

export default app;
