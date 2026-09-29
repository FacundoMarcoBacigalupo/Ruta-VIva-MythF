import { useMeta } from "@/hooks/useMeta";

export function Press() {
  useMeta({
    title: "Prensa y medios",
    description:
      "Press kit de RutaVivaMythF — la startup argentina que predice el riesgo vial antes de que ocurra. Logos, screenshots, stats y contacto directo."
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-16 space-y-12">
      <header>
        <h1 className="text-3xl md:text-5xl font-extrabold">Press kit</h1>
        <p className="mt-3 text-brand-500 md:text-lg max-w-2xl">
          Recursos para periodistas, creadores y medios que quieran cubrir RutaVivaMythF.
          Todo lo que ves acá es de uso libre con atribución a MythF.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-bold">¿Qué es RutaVivaMythF en una línea?</h2>
        <p className="mt-2 text-lg">
          "Como Google Maps, pero te dice qué tan peligrosa es tu ruta antes de salir,
          usando datos oficiales del gobierno, clima en vivo y reportes ciudadanos."
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold">Boilerplate (párrafo corto)</h2>
        <blockquote className="mt-2 p-4 bg-white border-l-4 border-ink-900 rounded-r-lg text-sm">
          RutaVivaMythF es un sistema de predicción de riesgo vial desarrollado en Argentina
          por la agencia <strong>MythF</strong>. Combina datos oficiales de la Agencia Nacional
          de Seguridad Vial (ANSV), condiciones climáticas en tiempo real y reportes ciudadanos
          en vivo para entregar un score de peligrosidad 0-100 a cualquier ruta, antes de
          que el conductor salga. Es gratuito para personas y ofrece API y dashboards para
          flotas, aseguradoras y organismos públicos. Lanzado en 2026.
        </blockquote>
      </section>

      <section>
        <h2 className="text-xl font-bold">Datos clave</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <Stat value="4.000+" label="muertes viales por año en AR" />
          <Stat value="25M" label="conductores en el país" />
          <Stat value="US$ 10B" label="costo anual siniestros" />
          <Stat value="0" label="competidores consumer predictivos" />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Screenshots</h2>
        <p className="text-sm text-brand-500 mt-1">Alta resolución en desktop, tablet y mobile.</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {[
            ["Home", "/screenshots/desktop/01-home.png"],
            ["Mapa de riesgo", "/screenshots/desktop/03-mapa.png"],
            ["Analizar ruta", "/screenshots/desktop/05-ruta-con-resultado.png"],
            ["Navegación en vivo", "/screenshots/desktop/06-navegar.png"],
            ["Dashboard B2B", "/screenshots/desktop/10-dashboard.png"],
            ["Mobile", "/screenshots/mobile/01-home.png"]
          ].map(([t, u]) => (
            <figure key={u} className="card overflow-hidden">
              <img src={u} alt={t} className="w-full aspect-video object-cover object-top bg-cream-100" loading="lazy" />
              <figcaption className="px-3 py-2 text-xs font-semibold">{t}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">Sobre MythF</h2>
        <p className="mt-2">
          <a href="https://mythf.site" target="_blank" rel="noreferrer" className="text-ink-900 font-semibold underline">MythF</a> es
          una agencia de desarrollo de software y marketing digital con base en Argentina. Además de
          RutaVivaMythF operan CRMythF (CRM) y TurnosMythF (gestión de turnos), y desarrollan
          productos a medida con IA integrada.
        </p>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-bold">Contacto para prensa</h2>
        <p className="text-sm text-brand-500 mt-1">Disponible para entrevistas, demos en vivo y contenido para medios.</p>
        <div className="mt-4 space-y-2 text-sm">
          <div>
            <span className="font-semibold">Email:</span>{" "}
            <a href="mailto:agenciamythf@gmail.com?subject=Consulta%20de%20prensa%20-%20RutaVivaMythF" className="text-ink-900 underline">
              agenciamythf@gmail.com
            </a>
          </div>
          <div>
            <span className="font-semibold">WhatsApp:</span>{" "}
            <a href="https://wa.me/541127398858" target="_blank" rel="noreferrer" className="text-ink-900 underline">
              +54 11 2739-8858
            </a>
          </div>
          <div>
            <span className="font-semibold">Agencia:</span>{" "}
            <a href="https://mythf.site" target="_blank" rel="noreferrer" className="text-ink-900 underline">mythf.site</a>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-extrabold text-ink-900">{value}</div>
      <div className="text-xs uppercase tracking-wide text-brand-500 mt-1">{label}</div>
    </div>
  );
}
