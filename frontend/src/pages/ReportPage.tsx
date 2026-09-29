import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { reportsApi } from "@/api/endpoints";
import type { ReportType } from "@/types";
import { useMeta } from "@/hooks/useMeta";

const TYPES: { value: ReportType; label: string }[] = [
  { value: "accidente", label: "Accidente" },
  { value: "bache", label: "Bache" },
  { value: "sin_senalizacion", label: "Sin señalización" },
  { value: "obra", label: "Obra" },
  { value: "inundacion", label: "Inundación" },
  { value: "niebla", label: "Niebla" },
  { value: "animales", label: "Animales en ruta" },
  { value: "otro", label: "Otro" }
];

export function ReportPage() {
  useMeta({ title: "Reportar un hecho en ruta", noindex: true });
  const [type, setType] = useState<ReportType>("accidente");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState(3);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [ok, setOk] = useState(false);

  const mutation = useMutation({
    mutationFn: reportsApi.create,
    onSuccess: () => setOk(true)
  });

  const locate = () => {
    if (!navigator.geolocation) {
      alert("Geolocalización no disponible en este navegador");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => alert("No pudimos obtener tu ubicación")
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
      alert("Primero detectá tu ubicación");
      return;
    }
    mutation.mutate({
      report_type: type,
      description: description || undefined,
      lat: coords.lat,
      lon: coords.lon,
      severity
    });
  };

  if (ok) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 text-center">
        <div className="text-5xl mb-3">✅</div>
        <h1 className="text-2xl font-bold">Reporte enviado</h1>
        <p className="text-brand-500 mt-2">Gracias por colaborar. Tu reporte ya aparece en el mapa en vivo.</p>
        <button className="btn-primary mt-4" onClick={() => { setOk(false); setDescription(""); setCoords(null); }}>
          Enviar otro
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Reportar un hecho en ruta</h1>
      <form onSubmit={submit} className="card p-5 space-y-4">
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as ReportType)}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Descripción (opcional)</label>
          <textarea
            className="input min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles que puedan ser útiles para otros conductores"
          />
        </div>

        <div>
          <label className="label">Gravedad: {severity}/5</label>
          <input
            type="range"
            min={1}
            max={5}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="label">Ubicación</label>
          {coords ? (
            <div className="text-sm bg-cream-100 rounded-lg p-3">
              📍 {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
              <button type="button" className="btn-ghost ml-2 text-xs" onClick={locate}>Reubicar</button>
            </div>
          ) : (
            <button type="button" className="btn-secondary w-full" onClick={locate}>
              📍 Detectar mi ubicación
            </button>
          )}
        </div>

        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
          {mutation.isPending ? "Enviando…" : "Enviar reporte"}
        </button>

        {mutation.isError && (
          <p className="text-sm text-red-600">Error: {(mutation.error as Error).message}</p>
        )}
      </form>
    </div>
  );
}
