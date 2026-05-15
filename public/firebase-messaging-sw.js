// firebase-messaging-sw.js
// Handles FCM push messages when the app is in the background or closed.
// Also handles notificationclick to open the correct page.

importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js");

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
  const { title, body, image } = payload.notification ?? {};
  const clickUrl = payload.data?.clickUrl ?? "/";

  self.registration.showNotification(title ?? "Junior Kitchen", {
    body: body ?? "",
    icon: image ?? "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: { clickUrl },
  });
});

// Notification click handler — focus/open the correct page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const clickUrl = event.notification.data?.clickUrl ?? "/";
  const fullUrl = new URL(clickUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If the app is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.postMessage({ type: "NAVIGATE", url: clickUrl });
            return client.focus();
          }
        }
        // Otherwise open a new tab
        return clients.openWindow(fullUrl);
      })
  );
});
