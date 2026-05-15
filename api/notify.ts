// api/notify.ts — Vercel Serverless Function for sending FCM push notifications.
// Called from the client after placing an order or advancing an order status.
//
// Events:
//   new_order   → Notify all admins + delivery partners (click opens /admin/orders)
//   order_update → Notify the customer who placed the order (click opens /orders/:orderId)

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// ── Firebase Admin singleton ─────────────────────────────────────────────────
function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]!;
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel env stores the key as a single-line string; restore newlines.
      privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    }),
  });
}

// ── Status labels ────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  pending:   "Pending",
  preparing: "Preparing 🍛",
  ready:     "Ready for Pickup 🛵",
  delivered: "Delivered ✅",
};

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type, orderId } = req.body ?? {};
  if (!type || !orderId) {
    return res.status(400).json({ error: "Missing type or orderId" });
  }

  try {
    const app   = getAdminApp();
    const db    = getFirestore(app);
    const fcm   = getMessaging(app);
    const tokens: string[] = [];

    if (type === "new_order") {
      // ── Notify admins and delivery partners ──────────────────────────────
      const snap = await db
        .collection("users")
        .where("role", "in", ["admin", "delivery"])
        .get();

      snap.forEach((doc) => {
        const userTokens: string[] = doc.data()?.fcmTokens ?? [];
        tokens.push(...userTokens);
      });

      if (tokens.length === 0) {
        return res.status(200).json({ sent: 0, message: "No staff tokens registered" });
      }

      const batchResponse = await fcm.sendEachForMulticast({
        tokens,
        notification: {
          title: "🔔 New Order Received!",
          body:  `Order #${orderId.slice(0, 8).toUpperCase()} has been placed.`,
          imageUrl: "https://junior-kitchen.vercel.app/pwa-192x192.png",
        },
        data: { clickUrl: "/admin/orders" },
        webpush: {
          fcmOptions: { link: `https://junior-kitchen.vercel.app/admin/orders` },
        },
      });

      return res.status(200).json({ sent: batchResponse.successCount });

    } else if (type === "order_update") {
      // ── Notify the customer who placed the order ──────────────────────────
      const orderSnap = await db.collection("orders").doc(orderId).get();
      if (!orderSnap.exists) {
        return res.status(404).json({ error: "Order not found" });
      }

      const orderData = orderSnap.data()!;
      const { userId, status } = orderData;

      const userSnap = await db.collection("users").doc(userId).get();
      const userTokens: string[] = userSnap.data()?.fcmTokens ?? [];

      if (userTokens.length === 0) {
        return res.status(200).json({ sent: 0, message: "No customer tokens registered" });
      }

      const label     = STATUS_LABEL[status] ?? status;
      const clickUrl  = `/orders/${orderId}`;
      const batchResponse = await fcm.sendEachForMulticast({
        tokens: userTokens,
        notification: {
          title: "🍛 Order Update",
          body:  `Your order is now: ${label}`,
          imageUrl: "https://junior-kitchen.vercel.app/pwa-192x192.png",
        },
        data: { clickUrl },
        webpush: {
          fcmOptions: { link: `https://junior-kitchen.vercel.app${clickUrl}` },
        },
      });

      return res.status(200).json({ sent: batchResponse.successCount });

    } else {
      return res.status(400).json({ error: `Unknown event type: ${type}` });
    }
  } catch (err: any) {
    console.error("[notify] Error:", err);
    return res.status(500).json({ error: err.message ?? "Internal Server Error" });
  }
}
