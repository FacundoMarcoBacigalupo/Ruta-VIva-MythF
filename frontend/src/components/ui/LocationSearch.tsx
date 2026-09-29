import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { geoApi } from "@/api/endpoints";
import type { GeocodeResult } from "@/types";

interface Props {
  placeholder?: string;
  onPick: (r: GeocodeResult) => void;
  className?: string;
  /** Zoom target que se pasa implícitamente al consumidor — acá solo es hint visual. */
  ariaLabel?: string;
}

/**
 * Búsqueda de localidad estilo Google Maps. Autocomplete contra Georef con
 * debounce de ~220 ms, dropdown animado, navegación por teclado y click-outside.
 */
export function LocationSearch({
  placeholder = "Buscar zona (ej: Caballito, CABA)",
  onPick,
  className,
  ariaLabel = "Buscar localidad en el mapa",
}: Props) {
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 220);
    return () => clearTimeout(t);
  }, [value]);

  const q = useQuery({
    queryKey: ["location-search", debounced],
    queryFn: () => geoApi.localities(debounced),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const results = (q.data?.results ?? []).slice(0, 6);
  // Mostramos el dropdown siempre que haya input y esté foqueado, así el user
  // ve "Buscando…" o "Sin resultados" en vez de quedar sin feedback.
  const showList = open && debounced.length >= 2;

  const pick = (r: GeocodeResult) => {
    setValue(r.label);
    setDebounced(r.label);
    setOpen(false);
    setHighlight(-1);
    inputRef.current?.blur();
    onPick(r);
  };

  const clear = () => {
    setValue("");
    setDebounced("");
    setOpen(false);
    setHighlight(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <div
        className="flex items-center gap-2 bg-white/95 backdrop-blur border border-brand-300 rounded-lg px-3 py-2 shadow-md focus-within:border-ink-900 focus-within:shadow-lg"
        style={{
          transitionProperty: "border-color, box-shadow, background-color",
          transitionDuration: "200ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-brand-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21 L16.5 16.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (!showList || results.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const idx = highlight >= 0 ? highlight : 0;
              pick(results[idx]);
            }
          }}
          placeholder={placeholder}
          className="flex-1 outline-none bg-transparent text-sm text-ink-900 placeholder:text-brand-400 min-w-0"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls="location-search-list"
          role="combobox"
        />
        {q.isFetching && debounced.length >= 2 && (
          <span
            className="w-3 h-3 border-2 border-brand-300 border-t-ink-900 rounded-full animate-spin shrink-0"
            aria-hidden
          />
        )}
        {value && !q.isFetching && (
          <button
            type="button"
            className="text-brand-400 hover:text-ink-900 shrink-0"
            onClick={clear}
            aria-label="Limpiar búsqueda"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6 L18 18 M6 18 L18 6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      <ul
        id="location-search-list"
        role="listbox"
        className={`absolute left-0 right-0 mt-1 bg-white border border-brand-200 rounded-lg shadow-xl overflow-hidden origin-top z-20 ${
          showList ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
        style={{
          transitionProperty: "opacity, transform",
          transitionDuration: "220ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {results.length === 0 && q.isFetching && (
          <li className="px-3 py-2 text-sm text-brand-500">Buscando…</li>
        )}
        {results.length === 0 && !q.isFetching && debounced.length >= 2 && (
          <li className="px-3 py-2 text-sm text-brand-500">Sin resultados</li>
        )}
        {results.map((r, i) => (
          <li key={`${r.lat}-${r.lon}-${i}`} role="option" aria-selected={i === highlight}>
            <button
              type="button"
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r)}
              className={`w-full text-left px-3 py-2 text-sm border-b border-brand-100 last:border-0 flex items-center gap-2 ${
                i === highlight ? "bg-cream-100" : "hover:bg-cream-100"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-brand-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 22 C12 22 4 14.5 4 9 A8 8 0 0 1 20 9 C20 14.5 12 22 12 22 Z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{r.label}</span>
                {(r.province || r.department) && (
                  <span className="block text-xs text-brand-500 truncate">
                    {[r.department, r.province].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
