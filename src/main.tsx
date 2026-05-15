import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

const router = getRouter();

// Register the Firebase Messaging service worker for background push handling
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js", { scope: "/" })
    .catch((err) => console.warn("[SW] Registration failed:", err));

  // Listen for NAVIGATE messages from the service worker (notification click)
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "NAVIGATE" && event.data.url) {
      router.navigate({ to: event.data.url });
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
