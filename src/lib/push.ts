// lib/push.ts — Firebase Cloud Messaging token management.
// Requests notification permission, gets the FCM token, and saves it to the user's Firestore document.

import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import app, { db } from "./firebase";

const VAPID_KEY = "BOmwfOpz6KvPcLy3lr6DewVX00938XDY6393S_JvsuHYg1voyEnD8H2VtdaNcJkf-R_BEN_MFaWi2Cl-AqdIT5E";

// FCM SW is registered at its own scope so it doesn't conflict with VitePWA's sw.js
const FCM_SW_URL   = "/firebase-messaging-sw.js";
const FCM_SW_SCOPE = "/firebase-messaging-sw-scope/";

/** Register (or re-use) the FCM service worker at its isolated scope. */
async function getFcmSwRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(FCM_SW_SCOPE);
  if (existing) return existing;
  return navigator.serviceWorker.register(FCM_SW_URL, { scope: FCM_SW_SCOPE });
}

/** Request notification permission and save the FCM token to Firestore. */
export async function subscribeToPush(uid: string): Promise<string | null> {
  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      console.warn("[push] Browser does not support notifications or service workers.");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[push] Notification permission denied.");
      return null;
    }

    const swReg = await getFcmSwRegistration();
    console.log("[push] Using SW registration:", swReg.scope);

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      console.warn("[push] getToken returned empty — check VAPID key and SW.");
      return null;
    }

    console.log("[push] FCM token obtained:", token.slice(0, 20) + "...");

    // Save token to users/{uid}.fcmTokens — arrayUnion deduplicates
    await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) });
    console.log("[push] Token saved to Firestore for uid:", uid);

    return token;
  } catch (err) {
    console.error("[push] subscribeToPush failed:", err);
    return null;
  }
}

/** Listen for foreground messages and show a browser notification. */
export function listenForegroundMessages() {
  try {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      console.log("[push] Foreground message received:", payload);
      const { title, body } = payload.notification ?? {};
      const clickUrl = payload.data?.clickUrl ?? "/";
      if (!title) return;

      if (Notification.permission === "granted") {
        const n = new Notification(title, { body, icon: "/pwa-192x192.png" });
        n.onclick = () => {
          window.focus();
          window.location.href = clickUrl;
        };
      }
    });
  } catch (err) {
    console.error("[push] listenForegroundMessages failed:", err);
  }
}
