// lib/push.ts — Firebase Cloud Messaging token management.
// Requests notification permission, gets the FCM token, and saves it to the user's Firestore document.

import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import app, { db } from "./firebase";

const VAPID_KEY = "BOmwfOpz6KvPcLy3lr6DewVX00938XDY6393S_JvsuHYg1voyEnD8H2VtdaNcJkf-R_BEN_MFaWi2Cl-AqdIT5E";

/** Request notification permission and save the FCM token to Firestore. */
export async function subscribeToPush(uid: string): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js"),
    });

    if (token) {
      // Save token to users/{uid}.fcmTokens array — deduped by arrayUnion
      await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) });
    }

    return token ?? null;
  } catch (err) {
    console.warn("[push] subscribeToPush failed:", err);
    return null;
  }
}

/** Listen for foreground messages and show a browser notification. */
export function listenForegroundMessages() {
  try {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification ?? {};
      const clickUrl = payload.data?.clickUrl ?? "/";
      if (!title) return;

      // Show a native browser notification (only works when app has focus in some browsers)
      if (Notification.permission === "granted") {
        const n = new Notification(title, {
          body,
          icon: "/pwa-192x192.png",
        });
        n.onclick = () => {
          window.focus();
          window.location.href = clickUrl;
        };
      }
    });
  } catch (err) {
    console.warn("[push] listenForegroundMessages failed:", err);
  }
}
