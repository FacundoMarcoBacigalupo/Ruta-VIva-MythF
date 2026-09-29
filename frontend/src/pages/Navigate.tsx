import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RiskMap } from "@/components/map/RiskMap";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { incidentsApi, predictApi } from "@/api/endpoints";
import type { RouteRiskResponse } from "@/types";
import { riskLabelText, escapeHtml } from "@/lib/utils";
import { useMeta } from "@/hooks/useMeta";

interface NavState {
  result: RouteRiskResponse;
  originLabel: string;
  destLabel: string;
}

export function NavigatePage() {
  useMeta({ title: "Navegación en vivo", noindex: true });
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as NavState | null;

  const initialPos = state?.result.segments[0]
    ? { lat: state.result.segments[0].lat, lon: state.result.segments[0].lon }
    : null;
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(initialPos);
  const [currentRisk, setCurrentRisk] = useState<{ score: number; label: string } | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number>(Date.now());
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!state) {
      navigate("/ruta", { replace: true });
      return;
    }
    startedAt.current = Date.now();

    if (!navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {
        // Fallback: usar el origen de la ruta como posición inicial
        if (state.result.segments[0]) {
          setPos({ lat: state.result.segments[0].lat, lon: state.result.segments[0].lon });
        }
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      clearInterval(timer);
    };
  }, [state, navigate]);

  // Recalcular riesgo del punto actual cada 30s
  useEffect(() => {
    if (!pos) return;
    let cancelled = false;
    const fetchRisk = async () => {
      try {
        const r = await predictApi.point({ lat: pos.lat, lon: pos.lon });
        if (!cancelled) {
          setCurrentRisk({
            score: (r as { risk_score: number }).risk_score,
            label: (r as { risk_label: string }).risk_label
          });
        }
      } catch {
        /* silencioso */
      }
    };
    fetchRisk();
    const id = setInterval(fetchRisk, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pos]);

  // Heatmap alrededor del viaje — bbox basado en la ruta
  const bbox = useMemo(() => {
    if (!state) return null;
    const lats = state.result.segments.map((s) => s.lat);
    const lons = state.result.segments.map((s) => s.lon);
    return {
      min_lat: Math.min(...lats) - 0.05,
      max_lat: Math.max(...lats) + 0.05,
      min_lon: Math.min(...lons) - 0.05,
      max_lon: Math.max(...lons) + 0.05
    };
  }, [state]);

  const heatmap = useQuery({
    queryKey: ["nav-heatmap", bbox],
    queryFn: () => incidentsApi.heatmap(bbox!),
    enabled: !!bbox
  });

  if (!state) return null;
  const { result, originLabel, destLabel } = state;

  // Trazado de la ruta (prioriza geometría GeoJSON real si el backend la mandó)
  const routeGeoJson: GeoJSON.Feature = useMemo(() => {
    if (result.geometry) {
      return {
        type: "Feature",
        properties: {},
        geometry: result.geometry
      };
    }
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: result.segments.map((s) => [s.lon, s.lat])
      }
    };
  }, [result]);

  const mmss = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="relative h-[calc(100vh-3.5rem)]">
      <div className="absolute inset-0">
        <RiskMap
          routeGeoJson={routeGeoJson}
          heatmapPoints={heatmap.data?.points ?? []}
          userLocation={pos}
          followUser={followUser}
          enableHeatPopup={false}
          markers={[
            { lat: result.segments[0].lat, lon: result.segments[0].lon, color: "#0a0a0a", popup: `Origen: ${escapeHtml(originLabel)}` },
            {
              lat: result.segments[result.segments.length - 1].lat,
              lon: result.segments[result.segments.length - 1].lon,
              color: "#ef4444",
              popup: `Destino: ${escapeHtml(destLabel)}`
            }
          ]}
        />
      </div>

      {/* Top overlay */}
      <div className="absolute top-3 left-3 right-3 md:left-4 md:right-auto md:w-[360px] z-10 pointer-events-none">
        <div className="card p-3 shadow-lg pointer-events-auto">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase text-brand-500">Riesgo actual</div>
              {currentRisk ? (
                <RiskBadge label={currentRisk.label} score={currentRisk.score} />
              ) : (
                <span className="text-sm text-brand-500">Calculando…</span>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-brand-500">Ruta estimada</div>
              <div className="text-sm font-semibold">{result.distance_km} km · {result.duration_min} min</div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-brand-100 flex items-center justify-between text-xs text-brand-500">
            <span>⏱️ {mmss(elapsed)} en viaje</span>
            <span>Promedio ruta: <span className="font-semibold text-ink-900">{riskLabelText(result.risk_label)}</span></span>
          </div>
        </div>
      </div>

      {/* Bottom overlay */}
      <div className="absolute bottom-3 left-3 right-3 md:left-auto md:right-4 md:w-[280px] z-10">
        <div className="card p-3 shadow-lg space-y-2">
          <div className="text-xs text-brand-500">
            <div className="truncate"><span className="text-emerald-600">●</span> {originLabel}</div>
            <div className="truncate"><span className="text-red-600">●</span> {destLabel}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`flex-1 btn ${followUser ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFollowUser((v) => !v)}
            >
              {followUser ? "📍 Centrado en mí" : "📍 Centrar en mí"}
            </button>
            <button className="btn-secondary" onClick={() => navigate("/ruta")}>
              Salir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
