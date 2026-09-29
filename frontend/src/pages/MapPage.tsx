import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { incidentsApi, reportsApi } from "@/api/endpoints";
import { RiskMap } from "@/components/map/RiskMap";
import { LocationSearch } from "@/components/ui/LocationSearch";
import { reportTypeText, formatDate, escapeHtml } from "@/lib/utils";
import { useMeta } from "@/hooks/useMeta";

interface Bbox {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
}

interface FlyTarget {
  lat: number;
  lon: number;
  zoom?: number;
}

export function MapPage() {
  useMeta({
    title: "Mapa de riesgo vial en Argentina",
    description:
      "Mapa de calor interactivo con siniestros viales históricos y reportes ciudadanos en vivo en toda Argentina."
  });
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [showList, setShowList] = useState(false);
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null);

  const heatmap = useQuery({
    queryKey: ["heatmap", bbox],
    queryFn: () => incidentsApi.heatmap(bbox!),
    enabled: !!bbox,
    refetchInterval: 120_000
  });

  const reports = useQuery({
    queryKey: ["reports-live"],
    queryFn: () => reportsApi.list(24),
    refetchInterval: 30_000
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold">Mapa de riesgo vial</h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </span>
              en vivo
            </span>
          </div>
          <p className="text-sm text-brand-500 mt-1">
            {heatmap.data?.total ?? 0} puntos de siniestralidad · {reports.data?.length ?? 0} reportes ciudadanos activos (24h)
          </p>
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500" /> bajo</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> medio</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> alto</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-900" /> crítico</span>
        </div>
        <button className="md:hidden btn-secondary" onClick={() => setShowList((v) => !v)}>
          {showList ? "Ver mapa" : `Ver reportes (${reports.data?.length ?? 0})`}
        </button>
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-4">
        <div className={`relative h-[60vh] md:h-[70vh] rounded-xl overflow-hidden border border-brand-200 ${showList ? "hidden md:block" : ""}`}>
          <div className="absolute top-3 left-3 right-3 md:right-auto md:w-96 z-10">
            <LocationSearch
              placeholder="Buscar zona (ej: Caballito, CABA)"
              onPick={(r) => setFlyTo({ lat: r.lat, lon: r.lon, zoom: 13 })}
            />
          </div>
          <RiskMap
            onMapMove={setBbox}
            flyTo={flyTo}
            heatmapPoints={heatmap.data?.points ?? []}
            markers={(reports.data ?? []).map((r) => ({
              lat: r.lat,
              lon: r.lon,
              color: "#f59e0b",
              popup: `<strong>${escapeHtml(reportTypeText(r.report_type))}</strong><br/>${escapeHtml(r.description ?? "")}`
            }))}
          />
        </div>

        <aside className={`card p-4 md:h-[70vh] overflow-y-auto ${showList ? "" : "hidden md:block"}`}>
          <h3 className="font-semibold mb-3">Reportes en vivo (24h)</h3>
          {reports.isLoading && <p className="text-sm text-brand-500">Cargando…</p>}
          {reports.data && reports.data.length === 0 && (
            <p className="text-sm text-brand-500">No hay reportes recientes.</p>
          )}
          <ul className="space-y-3">
            {(reports.data ?? []).map((r) => (
              <li key={r.id} className="border-l-4 border-amber-500 pl-3">
                <div className="font-semibold text-sm">{reportTypeText(r.report_type)}</div>
                <div className="text-xs text-brand-500">{formatDate(r.reported_at)}</div>
                {r.description && <p className="text-sm mt-1 text-ink-700">{r.description}</p>}
                <div className="text-xs text-brand-500 mt-1">
                  {r.lat.toFixed(3)}, {r.lon.toFixed(3)} · verificaciones: {r.verified}
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
