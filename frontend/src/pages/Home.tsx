import { Link } from "react-router-dom";
import { useMeta } from "@/hooks/useMeta";

export function Home() {
  useMeta({
    title: undefined,
    description:
      "Predicción de riesgo vial en Argentina con datos oficiales ANSV + clima + reportes ciudadanos. Gratis para personas, API para flotas y aseguradoras."
  });
  return (
    <div>
      <section className="bg-ink-900 text-cream">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-white/5 text-cream rounded-full border border-white/15">
              Argentina · 2026
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold leading-tight">
              Sabé qué tan peligrosa es tu ruta <span className="text-cream-300 underline decoration-cream-300/40 decoration-4 underline-offset-4">antes</span> de salir.
            </h1>
            <p className="mt-4 text-cream-300/90 md:text-lg">
              RutaVivaMythF combina datos históricos de siniestros viales, clima en tiempo real
              y reportes ciudadanos para predecir el riesgo de cualquier trayecto en Argentina.
              Gratis para personas; API y dashboard para empresas.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/ruta" className="btn bg-cream text-ink-900 hover:bg-cream-300 text-base">Analizar mi ruta</Link>
              <Link to="/mapa" className="btn border border-cream/30 text-cream hover:bg-white/5 text-base">Ver mapa de riesgo</Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="aspect-video rounded-xl bg-gradient-to-br from-brand-800 to-ink-900 border border-white/10 p-6">
              <div className="flex items-center gap-2 text-xs text-cream-400 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                live
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <span>AU Riccheri KM 21</span>
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs">Crítico 82</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <span>RN 7 - Junín</span>
                  <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-xs">Alto 63</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <span>Acceso Oeste KM 30</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs">Medio 44</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <span>RP 2 - Dolores</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs">Bajo 22</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="w-10 h-10 rounded-lg bg-cream-200 text-ink-900 font-bold flex items-center justify-center">1</div>
          <h3 className="mt-4 font-semibold text-lg">Datos oficiales</h3>
          <p className="mt-2 text-sm text-brand-500">
            Ingesta de siniestros ANSV publicados en datos.gob.ar, normalización con Georef y cruce con el Sistema Nacional de Información Criminal.
          </p>
        </div>
        <div className="card p-6">
          <div className="w-10 h-10 rounded-lg bg-cream-200 text-ink-900 font-bold flex items-center justify-center">2</div>
          <h3 className="mt-4 font-semibold text-lg">Clima y ruta viva</h3>
          <p className="mt-2 text-sm text-brand-500">
            Open-Meteo + reportes ciudadanos en vivo (baches, niebla, inundaciones, animales en ruta) ajustan el riesgo minuto a minuto.
          </p>
        </div>
        <div className="card p-6">
          <div className="w-10 h-10 rounded-lg bg-cream-200 text-ink-900 font-bold flex items-center justify-center">3</div>
          <h3 className="mt-4 font-semibold text-lg">API para flotas</h3>
          <p className="mt-2 text-sm text-brand-500">
            Empresas de logística, seguros y apps de movilidad pueden integrar el scoring a sus vehículos vía API REST autenticada.
          </p>
        </div>
      </section>

      <section className="bg-white border-y border-brand-200">
        <div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-extrabold text-ink-900">4.000+</div>
            <div className="text-xs uppercase tracking-wide text-brand-500 mt-1">muertes viales por año en AR</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-ink-900">25M</div>
            <div className="text-xs uppercase tracking-wide text-brand-500 mt-1">conductores en el país</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-ink-900">US$ 10B</div>
            <div className="text-xs uppercase tracking-wide text-brand-500 mt-1">costo anual estimado de siniestros</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-ink-900">0</div>
            <div className="text-xs uppercase tracking-wide text-brand-500 mt-1">herramientas consumer predictivas hasta hoy</div>
          </div>
        </div>
      </section>
    </div>
  );
}
