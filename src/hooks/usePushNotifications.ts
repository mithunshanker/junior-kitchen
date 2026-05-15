// hooks/usePushNotifications.ts
// Provides a hook that manages notification permission + FCM token subscription.
// Call this once in your layout or on the orders page after the user is logged in.

import { useEffect, useState } from "react";
import { subscribeToPush, listenForegroundMessages } from "@/lib/push";
import { useAuth } from "@/contexts/AuthContext";

type PermissionState = "unknown" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PermissionState>("unknown");
  const [loading, setLoading] = useState(false);

  // Detect current permission state on mount
  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    if (Notification.permission === "granted") {
      setPermission("granted");
      listenForegroundMessages();
    } else if (Notification.permission === "denied") {
      setPermission("denied");
    }
  }, []);

  // Auto-subscribe if already granted (e.g. returning user)
  useEffect(() => {
    if (permission === "granted" && user) {
      subscribeToPush(user.uid);
      listenForegroundMessages();
    }
  }, [permission, user]);

  async function requestPermission() {
    if (!user) return;
    setLoading(true);
    try {
      const token = await subscribeToPush(user.uid);
      if (token) {
        setPermission("granted");
        listenForegroundMessages();
      } else {
        setPermission("denied");
      }
    } catch {
      setPermission("denied");
    } finally {
      setLoading(false);
    }
  }

  return { permission, loading, requestPermission };
}
