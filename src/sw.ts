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
