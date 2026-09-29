import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, GeoJSONSource, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { HeatmapPoint } from "@/types";
import { incidentsApi } from "@/api/endpoints";
import { escapeHtml } from "@/lib/utils";

interface Props {
  center?: [number, number];
  zoom?: number;
  heatmapPoints?: HeatmapPoint[];
  routeGeoJson?: GeoJSON.Feature | null;
  markers?: Array<{ lat: number; lon: number; color?: string; popup?: string }>;
  userLocation?: { lat: number; lon: number; heading?: number } | null;
  followUser?: boolean;
  onMapMove?: (bbox: { min_lat: number; max_lat: number; min_lon: number; max_lon: number }) => void;
  /** Cuando cambia, el mapa vuela suavemente a ese punto con zoom. Cada pick debe
      crear un nuevo objeto (aunque sea el mismo lat/lon) para re-disparar el efecto. */
  flyTo?: { lat: number; lon: number; zoom?: number } | null;
  /** Si true, click en el mapa abre un popup con la explicación de la densidad
      de siniestros en esa zona (por qué el color). Default: true. */
  enableHeatPopup?: boolean;
  /** Label visible del waypoint activo (ej: "Origen", "Parada 2"). Cuando es
      truthy, el pin arrastrable aparece bottom-left del mapa. */
  activeDragTarget?: string | null;
  /** Llamado cuando el user suelta el pin sobre el mapa con las coords finales. */
  onPinDrop?: (coords: { lat: number; lon: number }) => void;
  className?: string;
}

const STYLE = import.meta.env.VITE_MAP_STYLE || "https://tiles.openfreemap.org/styles/liberty";

export function RiskMap({
  center = [-63.6, -38.4],
  zoom = 4,
  heatmapPoints = [],
  routeGeoJson,
  markers = [],
  userLocation,
  followUser = false,
  onMapMove,
  flyTo,
  enableHeatPopup = true,
  activeDragTarget,
  onPinDrop,
  className
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const heatPopupRef = useRef<Popup | null>(null);
  // Estado visual del drag del pin (bottom-left → mapa). null cuando no hay drag.
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center,
      zoom,
      attributionControl: { compact: true }
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("heat", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "heat-layer",
        type: "heatmap",
        source: "heat",
        maxzoom: 17,
        paint: {
          "heatmap-weight": ["get", "weight"],
          // Intensity calibrado para ~50K+ puntos reales — antes se saturaba
          // todo en rojo cuando se cargaban los siniestros de CABA.
          "heatmap-intensity": [
            "interpolate", ["linear"], ["zoom"],
            0, 0.6,
            5, 0.8,
            10, 1.0,
            13, 1.2,
            17, 1.5
          ],
          // Rampa de color tipo "calor real": transparente → verde → amarillo → naranja → rojo vivo → granate
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0.00, "rgba(16,185,129,0)",
            0.08, "rgba(34,197,94,0.35)",
            0.20, "rgba(250,204,21,0.55)",
            0.38, "rgba(249,115,22,0.75)",
            0.58, "rgba(239,68,68,0.88)",
            0.78, "rgba(220,38,38,0.95)",
            1.00, "rgba(127,29,29,1)"
          ],
          // Radio bajado al zoom medio/alto para que hotspots densos
          // (ej. avenidas de CABA) no se fundan en un único blob rojo.
          "heatmap-radius": [
            "interpolate", ["linear"], ["zoom"],
            0, 18,
            5, 22,
            8, 30,
            11, 38,
            14, 48,
            17, 68
          ],
          "heatmap-opacity": [
            "interpolate", ["linear"], ["zoom"],
            5, 0.8,
            11, 0.75,
            15, 0.65
          ]
        }
      });
      map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#4f46e5",
          "line-width": 10,
          "line-blur": 6,
          "line-opacity": 0.4
        }
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#6366f1",
          "line-width": 4,
          "line-opacity": 1
        }
      });

      const emit = () => {
        if (!onMapMove) return;
        const b = map.getBounds();
        // Redondeamos a 4 decimales (~11m) para que micro-movimientos del
        // fitBounds (ruido de punto flotante) no disparen refetches idénticos.
        const r = (v: number) => Math.round(v * 10000) / 10000;
        onMapMove({
          min_lat: r(b.getSouth()),
          max_lat: r(b.getNorth()),
          min_lon: r(b.getWest()),
          max_lon: r(b.getEast())
        });
      };
      emit();
      map.on("moveend", emit);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click en el mapa → popup explicando la densidad de siniestros en la zona.
  // Hacemos fetch al /incidents/cluster y mostramos un popup MapLibre con
  // el texto narrativo. No mostramos si el click cae sobre un marker (popup
  // del marker tiene prioridad) ni si está deshabilitado por el caller.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!enableHeatPopup) return;

    let currentRequestId = 0;

    const onClick = async (e: maplibregl.MapMouseEvent) => {
      // Si el click fue sobre un marker (origin/dest/report), no abrimos popup
      // nuestro — MapLibre ya maneja el popup del marker.
      const target = e.originalEvent?.target as HTMLElement | null;
      if (target?.closest(".maplibregl-marker")) return;

      const { lat, lng } = e.lngLat;
      // Zoom-aware radius: en zoom bajo pedimos radio más grande para que el
      // popup abarque un área visible; en zoom alto afinamos.
      const z = map.getZoom();
      const radius = z >= 14 ? 0.3 : z >= 11 ? 0.6 : z >= 8 ? 1.2 : 3.0;

      const reqId = ++currentRequestId;
      // Popup de loading inmediato para que el user vea feedback al instante
      if (!heatPopupRef.current) {
        heatPopupRef.current = new maplibregl.Popup({
          offset: 8,
          closeButton: true,
          maxWidth: "260px",
        });
      }
      heatPopupRef.current
        .setLngLat(e.lngLat)
        .setHTML('<div style="font-size:12px;color:#666">Analizando zona…</div>')
        .addTo(map);

      try {
        const data = await incidentsApi.cluster(lat, lng, radius);
        if (reqId !== currentRequestId) return; // request obsoleto, otro click más nuevo

        const COLOR_BY_DENSITY: Record<string, string> = {
          "muy alta": "#7f1d1d",
          alta: "#dc2626",
          media: "#f97316",
          baja: "#16a34a",
          "muy baja": "#6b7280",
        };
        const color = COLOR_BY_DENSITY[data.density_label] || "#6b7280";
        const bullets: string[] = [];
        if (data.fatalities > 0) bullets.push(`<li>Fatalidades: <b>${data.fatalities}</b></li>`);
        if (data.injuries > 0) bullets.push(`<li>Heridos: <b>${data.injuries}</b></li>`);
        if (data.top_road_type) bullets.push(`<li>Tipo de vía: ${escapeHtml(data.top_road_type)}</li>`);
        if (data.most_recent) {
          const d = new Date(data.most_recent.occurred_at);
          const dateStr = isNaN(d.getTime()) ? "-" : d.toLocaleDateString("es-AR");
          bullets.push(`<li>Último: ${dateStr}</li>`);
        }

        const html = `
          <div style="font-size:12px; line-height:1.45; color:#0a0a0a">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:${color}"></span>
              <strong style="text-transform:uppercase;letter-spacing:.04em;font-size:11px">
                Densidad ${escapeHtml(data.density_label)}
              </strong>
            </div>
            <div style="color:#444">${escapeHtml(data.explanation)}</div>
            ${bullets.length ? `<ul style="margin:6px 0 0;padding-left:16px">${bullets.join("")}</ul>` : ""}
          </div>
        `;
        heatPopupRef.current!.setHTML(html);
      } catch {
        if (reqId !== currentRequestId) return;
        heatPopupRef.current!.setHTML(
          '<div style="font-size:12px;color:#666">No se pudo analizar la zona.</div>'
        );
      }
    };

    map.on("click", onClick);
    map.getCanvas().style.cursor = "";
    return () => {
      map.off("click", onClick);
      heatPopupRef.current?.remove();
      heatPopupRef.current = null;
    };
  }, [enableHeatPopup]);

  // heatmap
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("heat") as GeoJSONSource | undefined;
      if (!src) {
        map.once("idle", apply);
        return;
      }
      src.setData({
        type: "FeatureCollection",
        features: heatmapPoints.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lon, p.lat] },
          properties: { weight: p.weight }
        }))
      });
    };
    apply();
  }, [heatmapPoints]);

  // route — dibujado progresivo tipo Google Maps. La secuencia es:
  //  1) fitBounds al recorrido completo (cámara se mueve ~1.1s)
  //  2) cuando la cámara termina (moveend), arranca el rAF que extiende la
  //     línea desde origen a destino (~2.2s)
  // Sin el paso 1 terminado antes del paso 2, ambas animaciones competían por
  // la GPU y la línea aparecía "trabada" y pintaba todo de golpe al final.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let rafId = 0;
    let moveendHandler: (() => void) | null = null;

    const apply = () => {
      const src = map.getSource("route") as GeoJSONSource | undefined;
      if (!src) {
        map.once("idle", apply);
        return;
      }
      if (!routeGeoJson || routeGeoJson.geometry.type !== "LineString") {
        src.setData({ type: "FeatureCollection", features: [] });
        return;
      }
      const fullCoords = (routeGeoJson.geometry as GeoJSON.LineString).coordinates;
      if (!fullCoords.length) {
        src.setData({ type: "FeatureCollection", features: [] });
        return;
      }

      // Empezamos con la línea vacía para que no haya flash del trazado completo.
      src.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [fullCoords[0], fullCoords[0]] }
      });

      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const startDrawing = () => {
        if (reduce) {
          src.setData(routeGeoJson);
          return;
        }
        const duration = 2200;
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // easeInOutCubic — arranca suave, acelera en el medio, desacelera al final
          const eased =
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          const count = Math.max(2, Math.floor(eased * fullCoords.length));
          src.setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: fullCoords.slice(0, count) }
          });
          if (t < 1) rafId = requestAnimationFrame(step);
        };
        rafId = requestAnimationFrame(step);
      };

      if (followUser) {
        // En navegación GPS no queremos mover la cámara, dibujar directo.
        startDrawing();
        return;
      }

      const lons = fullCoords.map((c) => c[0]);
      const lats = fullCoords.map((c) => c[1]);
      map.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)]
        ],
        { padding: 60, duration: 1100 }
      );
      // Esperamos a que la cámara se asiente. Usamos moveend (dispara cuando el
      // easing interno de MapLibre termina) + fallback con setTimeout por si
      // moveend tarda más de la cuenta.
      moveendHandler = () => {
        map.off("moveend", moveendHandler!);
        moveendHandler = null;
        startDrawing();
      };
      map.once("moveend", moveendHandler);
    };
    apply();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (moveendHandler) map.off("moveend", moveendHandler);
    };
  }, [routeGeoJson, followUser]);

  // pin markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = markers.map((m) => {
      const marker = new maplibregl.Marker({ color: m.color ?? "#0a0a0a" })
        .setLngLat([m.lon, m.lat])
        .addTo(map);
      if (m.popup) marker.setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(m.popup));
      return marker;
    });
  }, [markers]);

  // flyTo (pick de origen/destino o buscador) — animación suave con curva
  // cinematográfica. 2400ms con curve 1.8 hace que primero se aleje un poco
  // y después baje, sensación de "swoop" tipo Google Earth. Menos mareante
  // que el 1800ms anterior que volaba muy rápido.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    const target = flyTo;
    const run = () => {
      map.flyTo({
        center: [target.lon, target.lat],
        zoom: target.zoom ?? 13,
        duration: 2400,
        curve: 1.8,
        essential: true
      });
    };
    if (map.loaded()) run();
    else map.once("load", run);
  }, [flyTo]);

  // user location
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    const el = document.createElement("div");
    el.className = "user-dot";
    el.innerHTML = `
      <span class="user-pulse"></span>
      <span class="user-core"></span>
    `;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userLocation.lon, userLocation.lat]);
    } else {
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.lon, userLocation.lat])
        .addTo(map);
    }
    if (followUser) {
      map.easeTo({ center: [userLocation.lon, userLocation.lat], duration: 600, zoom: Math.max(map.getZoom(), 14) });
    }
  }, [userLocation, followUser]);

  // Handlers del pin arrastrable. Usamos pointer events así cubre mouse + touch,
  // y setPointerCapture para que los move/up sigan llegando aunque el cursor
  // salga del botón.
  const onPinPointerDown = (e: React.PointerEvent) => {
    if (!activeDragTarget || !onPinDrop) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragPos({ x: e.clientX, y: e.clientY });
  };
  const onPinPointerMove = (e: React.PointerEvent) => {
    if (!dragPos) return;
    setDragPos({ x: e.clientX, y: e.clientY });
  };
  const onPinPointerUp = (e: React.PointerEvent) => {
    if (!dragPos) {
      setDragPos(null);
      return;
    }
    const map = mapRef.current;
    const container = containerRef.current;
    setDragPos(null);
    if (!map || !container || !onPinDrop) return;
    const rect = container.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!inside) return;
    const px: [number, number] = [e.clientX - rect.left, e.clientY - rect.top];
    const ll = map.unproject(px);
    onPinDrop({ lat: ll.lat, lon: ll.lng });
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? "w-full h-full"}`}>
      {activeDragTarget && (
        <>
          <button
            type="button"
            aria-label={`Arrastrar pin para fijar ${activeDragTarget}`}
            onPointerDown={onPinPointerDown}
            onPointerMove={onPinPointerMove}
            onPointerUp={onPinPointerUp}
            onPointerCancel={() => setDragPos(null)}
            className="absolute bottom-3 left-3 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-ink-900 shadow-lg text-xs font-semibold text-ink-900 select-none touch-none"
            style={{
              cursor: dragPos ? "grabbing" : "grab",
              transition: "box-shadow 180ms ease, transform 160ms ease",
              transform: dragPos ? "scale(1.05)" : "none",
            }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
              <path d="M12 2 C8.13 2 5 5.13 5 9 c0 5.25 7 13 7 13 s7-7.75 7-13 c0-3.87-3.13-7-7-7 z M12 11.5 a2.5 2.5 0 1 1 0-5 a2.5 2.5 0 0 1 0 5 z" />
            </svg>
            <span>Arrastrá para fijar {activeDragTarget}</span>
          </button>
          {dragPos && (
            <div
              aria-hidden
              className="pointer-events-none fixed z-50 text-red-600"
              style={{
                left: dragPos.x - 14,
                top: dragPos.y - 28,
              }}
            >
              <svg viewBox="0 0 24 24" className="w-7 h-7 drop-shadow-lg" fill="currentColor">
                <path d="M12 2 C8.13 2 5 5.13 5 9 c0 5.25 7 13 7 13 s7-7.75 7-13 c0-3.87-3.13-7-7-7 z M12 11.5 a2.5 2.5 0 1 1 0-5 a2.5 2.5 0 0 1 0 5 z" />
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  );
}
