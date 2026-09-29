import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Escapa HTML para inyección segura en MapLibre popups y cualquier otro
 * contexto donde se use setHTML/innerHTML con contenido del usuario.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function riskLabelText(label: string): string {
  return (
    {
      critico: "Crítico",
      alto: "Alto",
      medio: "Medio",
      bajo: "Bajo",
      muy_bajo: "Muy bajo"
    } as Record<string, string>
  )[label] ?? label;
}

export function reportTypeText(t: string): string {
  return (
    {
      accidente: "Accidente",
      bache: "Bache",
      sin_senalizacion: "Sin señalización",
      obra: "Obra",
      inundacion: "Inundación",
      niebla: "Niebla",
      animales: "Animales en ruta",
      otro: "Otro"
    } as Record<string, string>
  )[t] ?? t;
}
