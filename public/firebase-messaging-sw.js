// firebase-messaging-sw.js
// Handles FCM push messages when the app is in the background or closed.
// Registered at scope /firebase-messaging-sw-scope/ to avoid conflicting with VitePWA's sw.js.

importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAAj-j0CNAaqKpZWp_imUTmaGiBgxkaFcQ",
  authDomain: "junior-kitchen.firebaseapp.com",
  projectId: "junior-kitchen",
  storageBucket: "junior-kitchen.firebasestorage.app",
  messagingSenderId: "982875354224",
  appId: "1:982875354224:web:c35678e80b8197b96070b5",
});

const messaging = firebase.messaging();

// Background message handler — shows the notification manually
messaging.onBackgroundMessage((payload) => {
  console.log("[FCM SW] Background message received:", payload);
  const { title, body, image } = payload.notification ?? {};
  const clickUrl = payload.data?.clickUrl ?? "/";

  self.registration.showNotification(title ?? "Junior Kitchen", {
    body: body ?? "",
    icon: image ?? "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: { clickUrl },
  });
});

// Notification click — focus existing window or open new tab
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const clickUrl = event.notification.data?.clickUrl ?? "/";
  const fullUrl = new URL(clickUrl, "https://junior-kitchen.vercel.app").href;

  event.waitUntil(
    // includeUncontrolled:true lets this SW (scoped to /fcm-scope/) see ALL app windows
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            // Post a NAVIGATE message so the already-open app routes to the right page
            client.postMessage({ type: "NAVIGATE", url: clickUrl });
            return client.focus();
          }
        }
        // No window open — open a new one
        return clients.openWindow(fullUrl);
      })
  );
});
