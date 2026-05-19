// lib/auth.ts — Firebase Auth helper functions for the entire app.

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: "customer" | "admin" | "delivery";
  createdAt: Timestamp;
}

/** Sign in with email/password. */
export async function signIn(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/**
 * Create a new account and write the user profile to Firestore.
 * All new users default to role "customer".
 */
export async function signUp(
  email: string,
  password: string,
  name: string,
  phone: string
) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const profile: Omit<UserProfile, "uid"> = {
    name,
    email,
    phone,
    role: "customer",
    createdAt: serverTimestamp() as Timestamp,
  };
  await setDoc(doc(db, "users", cred.user.uid), profile);
  return cred.user;
}

/**
 * Sign in with Google.
 * If the user doesn't exist in Firestore, creates a profile for them.
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  const uid = cred.user.uid;
  const email = cred.user.email || "";
  const name = cred.user.displayName || "Google User";

  // Check if profile exists
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    const profile: Omit<UserProfile, "uid"> = {
      name,
      email,
      phone: cred.user.phoneNumber || "",
      role: "customer",
      createdAt: serverTimestamp() as Timestamp,
    };
    await setDoc(doc(db, "users", uid), profile);
  }

  return cred.user;
}

/** Sign out. */
export async function signOut() {
  await firebaseSignOut(auth);
}

/** Fetch a user's profile document from /users/{uid}. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid, ...(snap.data() as Omit<UserProfile, "uid">) };
}

/** Subscribe to Firebase auth state changes. Returns unsubscribe fn. */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
