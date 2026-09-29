import { useCallback, useState } from "react";
import { pushApi } from "@/api/endpoints";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

function buf2b64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return window
    .btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export type PushStatus = "unsupported" | "idle" | "requesting" | "subscribed" | "denied" | "error" | "unconfigured";

export function usePush() {
  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const [status, setStatus] = useState<PushStatus>(supported ? "idle" : "unsupported");
  const [error, setError] = useState<string | null>(null);

  const subscribe = useCallback(
    async (savedRouteId?: number) => {
      if (!supported) {
        setStatus("unsupported");
        return false;
      }
      setError(null);
      setStatus("requesting");

      try {
        const { public_key } = await pushApi.vapidPublicKey();
        if (!public_key) {
          setStatus("unconfigured");
          setError("El backend no tiene VAPID configurado. Push deshabilitado.");
          return false;
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus("denied");
          return false;
        }

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(public_key) as BufferSource
          });
        }

        const json = sub.toJSON();
        await pushApi.subscribe({
          endpoint: sub.endpoint,
          p256dh: (json.keys?.p256dh as string) || buf2b64(sub.getKey("p256dh")),
          auth: (json.keys?.auth as string) || buf2b64(sub.getKey("auth")),
          saved_route_id: savedRouteId
        });

        setStatus("subscribed");
        return true;
      } catch (e) {
        setStatus("error");
        setError((e as Error).message);
        return false;
      }
    },
    [supported]
  );

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await pushApi.unsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("idle");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [supported]);

  return { supported, status, error, subscribe, unsubscribe };
}
