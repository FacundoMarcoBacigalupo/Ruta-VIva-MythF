import { useEffect } from "react";

interface MetaOptions {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  noindex?: boolean;
}

const DEFAULT_TITLE = "RutaVivaMythF — Predicción de riesgo vial en Argentina";
const DEFAULT_DESC =
  "Sabé qué tan peligrosa es tu ruta antes de salir. Datos oficiales ANSV + clima + reportes ciudadanos. Gratis para personas, API para flotas y aseguradoras.";
const SITE_URL = "https://rutaviva.mythf.site";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function upsertMeta(selector: string, attr: "content" | "href", value: string) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    if (selector.startsWith("link")) {
      el = document.createElement("link");
      const rel = selector.match(/rel="([^"]+)"/)?.[1];
      if (rel) (el as HTMLLinkElement).rel = rel;
    } else {
      el = document.createElement("meta");
      const nameMatch = selector.match(/name="([^"]+)"/);
      const propMatch = selector.match(/property="([^"]+)"/);
      if (nameMatch) (el as HTMLMetaElement).name = nameMatch[1];
      if (propMatch) (el as HTMLMetaElement).setAttribute("property", propMatch[1]);
    }
    document.head.appendChild(el);
  }
  (el as HTMLElement).setAttribute(attr, value);
}

export function useMeta(opts: MetaOptions) {
  useEffect(() => {
    const title = opts.title ? `${opts.title} — RutaVivaMythF` : DEFAULT_TITLE;
    const description = opts.description || DEFAULT_DESC;
    const image = opts.image || DEFAULT_IMAGE;
    const url =
      opts.canonical ||
      (typeof window !== "undefined" ? `${SITE_URL}${window.location.pathname}` : SITE_URL);

    document.title = title;

    upsertMeta('meta[name="description"]', "content", description);
    upsertMeta('link[rel="canonical"]', "href", url);

    if (opts.noindex) {
      upsertMeta('meta[name="robots"]', "content", "noindex, nofollow");
    } else {
      upsertMeta('meta[name="robots"]', "content", "index, follow");
    }

    // Open Graph
    upsertMeta('meta[property="og:title"]', "content", title);
    upsertMeta('meta[property="og:description"]', "content", description);
    upsertMeta('meta[property="og:url"]', "content", url);
    upsertMeta('meta[property="og:image"]', "content", image);
    upsertMeta('meta[property="og:type"]', "content", "website");
    upsertMeta('meta[property="og:locale"]', "content", "es_AR");
    upsertMeta('meta[property="og:site_name"]', "content", "RutaVivaMythF");

    // Twitter
    upsertMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "content", title);
    upsertMeta('meta[name="twitter:description"]', "content", description);
    upsertMeta('meta[name="twitter:image"]', "content", image);
  }, [opts.title, opts.description, opts.canonical, opts.image, opts.noindex]);
}
