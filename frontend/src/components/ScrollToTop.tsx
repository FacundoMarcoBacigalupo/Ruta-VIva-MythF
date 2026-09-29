import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrollea suavemente al tope cada vez que cambia la ruta.
 * - Usa requestAnimationFrame con easing easeOutCubic para una animación
 *   consistente entre navegadores (el behavior:"smooth" nativo no tiene
 *   duración configurable).
 * - Duración ~500 ms (lenta-media-rápida, según pedido).
 * - Respeta prefers-reduced-motion: salto instantáneo.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduce =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const start = window.scrollY || document.documentElement.scrollTop || 0;
    if (start <= 0) return;

    if (reduce) {
      window.scrollTo(0, 0);
      return;
    }

    const duration = 500;
    const startTime = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      window.scrollTo(0, start * (1 - eased));
      if (t < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafId);
  }, [pathname]);

  return null;
}
