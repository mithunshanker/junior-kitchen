import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      // generateSW strategy: VitePWA auto-generates the precaching SW (sw.js).
      // The FCM background handler remains at /firebase-messaging-sw.js (registered manually in main.tsx).
      strategies: "generateSW",
      manifest: {
        name: "Junior Kitchen Briyani",
        short_name: "Junior Kitchen",
        description: "Order fresh Briyani from Junior Kitchen",
        theme_color: "#c0392b",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Don't let the generated SW intercept the FCM service worker file
        navigateFallbackDenylist: [/^\/firebase-messaging-sw\.js/],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
