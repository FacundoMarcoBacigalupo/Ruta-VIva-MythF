/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Precache de assets inyectado por vite-plugin-pwa (injectManifest)
precacheAndRoute(self.__WB_MANIFEST || []);

// Activación inmediata (no esperar a cerrar pestañas)
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Web Push: mostrar notificación al recibir
self.addEventListener("push", (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "RutaVivaMythF", body: event.data?.text() ?? "" };
  }

  const title = data.title || "RutaVivaMythF";
  const options: NotificationOptions = {
    body: data.body || "",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: { url: data.url || "/" },
    tag: data.tag || "rutaviva-alert",
    requireInteraction: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Abrir la URL adjunta al click
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data as { url?: string })?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        try {
          if ("focus" in c) {
            (c as WindowClient).navigate(targetUrl).catch(() => undefined);
            return (c as WindowClient).focus();
          }
        } catch {
          // ignore
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
