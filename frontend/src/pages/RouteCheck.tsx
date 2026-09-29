import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { geoApi, incidentsApi, predictApi, reportsApi } from "@/api/endpoints";
import { RiskMap } from "@/components/map/RiskMap";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Spinner } from "@/components/ui/Spinner";
import type { GeocodeResult, RouteRiskResponse } from "@/types";
import { escapeHtml, reportTypeText } from "@/lib/utils";
import { useMeta } from "@/hooks/useMeta";
import { usePush } from "@/hooks/usePush";
import { savedRoutesApi } from "@/api/endpoints";
import { useAuth } from "@/store/auth";

function AddressSearch({
  label,
  value,
  picked,
  active,
  onChange,
  onPick,
  onFocus,
  onRemove,
  placeholder = "Ej: Caballito, CABA · o Av. Corrientes 1000",
}: {
  label: string;
  value: string;
  picked: boolean;
  active?: boolean;
  onChange: (v: string) => void;
  onPick: (r: GeocodeResult) => void;
  onFocus?: () => void;
  onRemove?: () => void;
  placeholder?: string;
}) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 280);
    return () => clearTimeout(t);
  }, [value]);

  const q = useQuery({
    queryKey: ["addr-search", debounced],
    queryFn: () => geoApi.localities(debounced),
    enabled: debounced.length >= 3 && !picked,
    staleTime: 60_000,
  });

  const results = (q.data?.results ?? []).slice(0, 6);
  const showList = !picked && debounced.length >= 3;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label mb-1">{label}</label>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-brand-500 hover:text-red-600"
            aria-label={`Quitar ${label}`}
          >
            Quitar
          </button>
        )}
      </div>
      <input
        className={`input ${active ? "ring-2 ring-ink-900 ring-offset-1" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
      />
      {active && (
        <p className="text-[11px] text-brand-500 mt-1">
          Tipeá o arrastrá el pin desde el mapa para fijar este punto.
        </p>
      )}
      {showList && (
        <ul className="mt-1 border border-brand-200 rounded-lg bg-white max-h-48 overflow-auto text-sm">
          {results.length === 0 && q.isFetching && (
            <li className="px-3 py-2 text-brand-500">Buscando…</li>
          )}
          {results.length === 0 && !q.isFetching && (
            <li className="px-3 py-2 text-brand-500">Sin resultados</li>
          )}
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lon}-${i}`}>
              <button
                type="button"
                onClick={() => onPick(r)}
                className="w-full text-left px-3 py-2 hover:bg-cream-100 border-b border-brand-100 last:border-0"
              >
                {r.label}
                {r.province && <span className="text-xs text-brand-500 block">{r.province}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Stop {
  id: string;
  text: string;
  picked: GeocodeResult | null;
}

export function RouteCheck() {
  useMeta({
    title: "Analizar riesgo de mi ruta",
    description:
      "Calculá qué tan peligrosa es tu ruta antes de salir. Score, distancia, clima y recomendaciones en segundos."
  });
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<GeocodeResult | null>(null);
  const [dest, setDest] = useState<GeocodeResult | null>(null);
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [result, setResult] = useState<RouteRiskResponse | null>(null);
  // Identifica qué input está "activo" para el drag & drop del pin.
  // Valores: "origin" | "dest" | "stop:<id>" | null
  const [activeWaypoint, setActiveWaypoint] = useState<string | null>(null);
  const [bbox, setBbox] = useState<{ min_lat: number; max_lat: number; min_lon: number; max_lon: number } | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);

  const mutation = useMutation({
    mutationFn: predictApi.route,
    onSuccess: setResult
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !dest) return;
    mutation.mutate({
      origin_lat: origin.lat,
      origin_lon: origin.lon,
      dest_lat: dest.lat,
      dest_lon: dest.lon,
      waypoints: stops
        .filter((s) => s.picked)
        .map((s) => ({ lat: s.picked!.lat, lon: s.picked!.lon })),
    });
  };

  // Manejo de stops ---
  const addStop = () => {
    setStops((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: "", picked: null },
    ]);
  };
  const updateStop = (id: string, patch: Partial<Stop>) => {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const removeStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
    if (activeWaypoint === `stop:${id}`) setActiveWaypoint(null);
  };

  // Drop del pin sobre el mapa: reverse geocode + setea el waypoint activo.
  const handlePinDrop = async ({ lat, lon }: { lat: number; lon: number }) => {
    if (!activeWaypoint) return;
    // Asignación optimista con coords crudas por si el reverse tarda.
    const placeholder: GeocodeResult = {
      label: `Punto ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      lat,
      lon,
      province: null,
      department: null,
      locality: null,
    };
    applyPick(activeWaypoint, placeholder);
    setFlyTo({ lat, lon, zoom: 14 });
    try {
      const reversed = await geoApi.reverse(lat, lon);
      applyPick(activeWaypoint, reversed);
    } catch {
      // si falla, nos quedamos con el placeholder
    }
  };
  const applyPick = (target: string, r: GeocodeResult) => {
    if (target === "origin") {
      setOrigin(r);
      setOriginText(r.label);
    } else if (target === "dest") {
      setDest(r);
      setDestText(r.label);
    } else if (target.startsWith("stop:")) {
      const id = target.slice(5);
      updateStop(id, { picked: r, text: r.label });
    }
  };

  const activeLabel = (() => {
    if (activeWaypoint === "origin") return "origen";
    if (activeWaypoint === "dest") return "destino";
    if (activeWaypoint?.startsWith("stop:")) {
      const idx = stops.findIndex((s) => `stop:${s.id}` === activeWaypoint);
      return idx >= 0 ? `parada ${idx + 1}` : "parada";
    }
    return null;
  })();

  const startNavigation = () => {
    if (!result || !origin || !dest) return;
    navigate("/navegar", {
      state: { result, originLabel: origin.label, destLabel: dest.label }
    });
  };

  const heatmap = useQuery({
    queryKey: ["ruta-heatmap", bbox],
    queryFn: () => incidentsApi.heatmap(bbox!),
    enabled: !!bbox,
    refetchInterval: 120_000
  });
  // Amenazas vivas (reportes ciudadanos últimas 24 h) — se re-fetchean cada 30 s
  // para que si alguien reporta un bache/niebla/accidente, aparezca sin refresh.
  const reports = useQuery({
    queryKey: ["ruta-reports-live"],
    queryFn: () => reportsApi.list(24),
    refetchInterval: 30_000
  });

  // Memoizamos para mantener identidad estable de referencia. Sin esto, el
  // effect de RiskMap que depende de routeGeoJson re-corría en cada render y
  // entraba en loop: fitBounds → moveend → setBbox → re-render → nuevo obj.
  const routeGeoJson: GeoJSON.Feature | null = useMemo(() => {
    if (!result) return null;
    // Si el backend mandó la geometría exacta (GeoJSON), la usamos directo
    if (result.geometry) {
      return {
        type: "Feature",
        properties: {},
        geometry: result.geometry,
      };
    }
    // Fallback por si no hay geometry (usar los puntos de los segmentos)
    if (!result.segments.length) return null;
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: result.segments.map((s) => [s.lon, s.lat]),
      },
    };
  }, [result]);

  const markers = useMemo(() => {
    const reportMarkers = (reports.data ?? []).map((r) => ({
      lat: r.lat,
      lon: r.lon,
      color: "#f59e0b",
      popup: `<strong>${escapeHtml(reportTypeText(r.report_type))}</strong><br/>${escapeHtml(r.description ?? "")}`,
    }));
    const stopMarkers = stops
      .filter((s) => s.picked)
      .map((s, i) => ({
        lat: s.picked!.lat,
        lon: s.picked!.lon,
        color: "#2563eb",
        popup: `Parada ${i + 1}: ${escapeHtml(s.picked!.label)}`,
      }));
    return [
      origin && { lat: origin.lat, lon: origin.lon, color: "#0a0a0a", popup: `Origen: ${escapeHtml(origin.label)}` },
      dest && { lat: dest.lat, lon: dest.lon, color: "#ef4444", popup: `Destino: ${escapeHtml(dest.label)}` },
      ...stopMarkers,
      ...reportMarkers,
    ].filter(Boolean) as Array<{ lat: number; lon: number; color?: string; popup?: string }>;
  }, [origin, dest, stops, reports.data]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 grid md:grid-cols-[380px_1fr] gap-4">
      <div className="space-y-4 order-2 md:order-1">
        <h1 className="text-2xl font-bold">Analizar mi ruta</h1>
        <form onSubmit={submit} className="card p-4 space-y-3">
          <AddressSearch
            label="Origen"
            value={originText}
            picked={!!origin}
            active={activeWaypoint === "origin"}
            onChange={(v) => { setOriginText(v); setOrigin(null); }}
            onFocus={() => setActiveWaypoint("origin")}
            onPick={(r) => {
              setOrigin(r);
              setOriginText(r.label);
              setFlyTo({ lat: r.lat, lon: r.lon, zoom: 14 });
            }}
          />

          {stops.map((s, i) => (
            <AddressSearch
              key={s.id}
              label={`Parada ${i + 1}`}
              value={s.text}
              picked={!!s.picked}
              active={activeWaypoint === `stop:${s.id}`}
              placeholder="Ej: parada intermedia"
              onChange={(v) => updateStop(s.id, { text: v, picked: null })}
              onFocus={() => setActiveWaypoint(`stop:${s.id}`)}
              onPick={(r) => {
                updateStop(s.id, { picked: r, text: r.label });
                setFlyTo({ lat: r.lat, lon: r.lon, zoom: 14 });
              }}
              onRemove={() => removeStop(s.id)}
            />
          ))}

          <button
            type="button"
            onClick={addStop}
            disabled={stops.length >= 8}
            className="w-full rounded-lg border border-dashed border-brand-300 py-2 text-sm text-brand-500 hover:bg-cream-100 hover:text-ink-900 hover:border-ink-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Agregar parada {stops.length >= 8 && "(máx 8)"}
          </button>

          <AddressSearch
            label="Destino"
            value={destText}
            picked={!!dest}
            active={activeWaypoint === "dest"}
            onChange={(v) => { setDestText(v); setDest(null); }}
            onFocus={() => setActiveWaypoint("dest")}
            onPick={(r) => {
              setDest(r);
              setDestText(r.label);
              setFlyTo({ lat: r.lat, lon: r.lon, zoom: 14 });
            }}
          />

          <button
            type="submit"
            disabled={!origin || !dest || mutation.isPending}
            className="btn-primary w-full"
          >
            {mutation.isPending ? <><Spinner className="mr-2" /> Calculando…</> : "Calcular riesgo"}
          </button>
          {mutation.isError && (
            <p className="text-sm text-red-600">Error: {(mutation.error as Error).message}</p>
          )}
        </form>

        {result && (
          <div className="card p-4 space-y-3">
            <RiskBadge label={result.risk_label} score={result.overall_risk} />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-brand-500">Distancia</div>
                <div className="font-semibold">{result.distance_km} km</div>
              </div>
              <div>
                <div className="text-xs text-brand-500">Duración</div>
                <div className="font-semibold">{result.duration_min} min</div>
              </div>
            </div>
            {result.weather?.available && result.weather.current && (
              <div className="text-sm bg-cream-100 p-3 rounded-lg">
                <div className="text-xs font-semibold uppercase text-brand-500 mb-1">Clima en ruta</div>
                <div>🌡️ {result.weather.current.temperature_2m}°C</div>
                <div>💧 {result.weather.current.precipitation} mm · 💨 {result.weather.current.wind_speed_10m} km/h</div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold uppercase text-brand-500 mb-1">Recomendaciones</div>
              <ul className="text-sm space-y-1">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2"><span>→</span><span>{r}</span></li>
                ))}
              </ul>
            </div>
            <button onClick={startNavigation} className="btn-primary w-full">
              🧭 Iniciar navegación en vivo
            </button>
            <SaveAndAlertRow origin={origin} dest={dest} />
          </div>
        )}
      </div>

      <div className="h-[45vh] md:h-[75vh] rounded-xl overflow-hidden border border-brand-200 order-1 md:order-2">
        <RiskMap
          routeGeoJson={routeGeoJson}
          markers={markers}
          heatmapPoints={heatmap.data?.points ?? []}
          onMapMove={setBbox}
          flyTo={flyTo}
          activeDragTarget={activeLabel}
          onPinDrop={handlePinDrop}
        />
      </div>
    </div>
  );
}

function SaveAndAlertRow({ origin, dest }: { origin: GeocodeResult | null; dest: GeocodeResult | null }) {
  const { token } = useAuth();
  const push = usePush();
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  if (!origin || !dest) return null;

  const save = async () => {
    if (!token) {
      setSavedMsg("Ingresá para guardar rutas y recibir alertas.");
      return;
    }
    setSaving(true);
    setSavedMsg(null);
    try {
      const name = `${origin.label.split(",")[0]} → ${dest.label.split(",")[0]}`;
      const saved = await savedRoutesApi.create({
        name,
        origin_label: origin.label,
        origin_lat: origin.lat,
        origin_lon: origin.lon,
        dest_label: dest.label,
        dest_lat: dest.lat,
        dest_lon: dest.lon
      });
      const ok = await push.subscribe(saved.id);
      setSavedMsg(ok ? "✓ Ruta guardada y alertas activadas." : "✓ Ruta guardada. Alertas push no disponibles.");
    } catch (e) {
      setSavedMsg(`Error: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-2 border-t border-brand-100 space-y-2">
      <button onClick={save} disabled={saving} className="btn-secondary w-full text-sm">
        {saving ? "Guardando…" : "🔔 Guardar ruta y recibir alertas de riesgo"}
      </button>
      {savedMsg && <p className="text-xs text-brand-500">{savedMsg}</p>}
      {push.status === "denied" && (
        <p className="text-xs text-brand-500">Para recibir alertas, permití notificaciones en tu navegador.</p>
      )}
    </div>
  );
}
