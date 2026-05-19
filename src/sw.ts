/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

// ── 1. Initialize Workbox Precaching ─────────────────────────────────────────
self.skipWaiting();
clientsClaim();

// The __WB_MANIFEST is injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA routing fallback
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

// ── 2. Initialize Firebase Cloud Messaging ───────────────────────────────────
// We import the compat scripts synchronously at the top level
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

// Initialize Firebase App in the Service Worker
// @ts-ignore
firebase.initializeApp({
  apiKey: "AIzaSyAAj-j0CNAaqKpZWp_imUTmaGiBgxkaFcQ",
  authDomain: "junior-kitchen.firebaseapp.com",
  projectId: "junior-kitchen",
  storageBucket: "junior-kitchen.firebasestorage.app",
  messagingSenderId: "982875354224",
  appId: "1:982875354224:web:c35678e80b8197b96070b5",
});

// @ts-ignore
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload: any) => {
  console.log("[FCM SW] Background message received:", payload);
  // Do NOT manually call showNotification if payload contains `notification`
  // The Firebase SDK automatically displays it.
});

// ── 3. Handle Notification Clicks ────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const clickUrl = event.notification.data?.clickUrl ?? "/";
  const fullUrl = new URL(clickUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.postMessage({ type: "NAVIGATE", url: clickUrl });
            return client.focus();
          }
        }
        return self.clients.openWindow(fullUrl);
      })
  );
});
