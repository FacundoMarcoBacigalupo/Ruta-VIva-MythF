import { useMeta } from "@/hooks/useMeta";

export function Terms() {
  useMeta({
    title: "Términos y condiciones",
    description: "Términos de uso del servicio RutaVivaMythF."
  });

  return (
    <article className="max-w-3xl mx-auto px-4 py-10 md:py-16 space-y-6">
      <header>
        <h1 className="text-3xl md:text-4xl font-extrabold">Términos y condiciones</h1>
        <p className="text-xs text-brand-500 mt-2">Última actualización: abril de 2026</p>
      </header>

      <Section title="1. Aceptación">
        <p>
          Al usar <strong>rutaviva.mythf.site</strong> (el "Servicio"), aceptás estos términos.
          Si no estás de acuerdo, no uses el Servicio.
        </p>
      </Section>

      <Section title="2. Qué es el Servicio">
        <p>
          RutaVivaMythF es una herramienta informativa de <strong>predicción de riesgo vial</strong>{" "}
          que combina datos históricos, clima y reportes ciudadanos. El score es un indicador
          estadístico y <strong>no es un diagnóstico ni garantía de seguridad</strong>. El
          responsable último de su conducción sigue siendo el conductor.
        </p>
      </Section>

      <Section title="3. Cuenta y uso aceptable">
        <p>Te comprometés a:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Proveer información veraz al registrarte.</li>
          <li>Cuidar tu contraseña y notificarnos ante accesos no autorizados.</li>
          <li>No usar el Servicio para fines ilegales, de spam o para dañar a terceros.</li>
          <li>No intentar vulnerar la seguridad, hacer scraping masivo ni evadir rate limits.</li>
          <li>No cargar reportes ciudadanos falsos o engañosos (pueden borrarse y baneamos la cuenta).</li>
        </ul>
      </Section>

      <Section title="4. Propiedad intelectual">
        <p>
          El código, diseño, marca "RutaVivaMythF" y el motor de scoring son propiedad de MythF.
          Los datos abiertos de terceros (ANSV, datos.gob.ar, OpenStreetMap, Open-Meteo) mantienen
          sus licencias originales.
        </p>
        <p>
          Los <strong>reportes ciudadanos</strong> que subís seguís siendo tuyos, pero nos otorgás
          una licencia no exclusiva, mundial y gratuita para mostrarlos en el Servicio y usarlos
          agregados para mejorar el modelo.
        </p>
      </Section>

      <Section title="5. Servicio gratuito y planes B2B">
        <p>
          El uso personal del Servicio es <strong>gratuito</strong>. Los planes para empresas y
          flotas se cotizan por separado y se regulan por contrato individual.
        </p>
      </Section>

      <Section title="6. Disponibilidad y modificaciones">
        <p>
          Trabajamos para que el Servicio esté disponible 24/7 pero no garantizamos uptime total.
          Podemos modificar, suspender o discontinuar funcionalidades avisando por email cuando
          corresponda.
        </p>
      </Section>

      <Section title="7. Limitación de responsabilidad">
        <p>
          En la medida que permita la ley argentina, <strong>MythF no es responsable por:</strong>
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Decisiones de manejo o ruteo que tomes basándote en el score.</li>
          <li>Accidentes, daños o pérdidas económicas derivados del uso del Servicio.</li>
          <li>Errores, omisiones o inexactitudes en los datos de terceros (ANSV, clima, etc).</li>
          <li>Caídas de servicios externos (Vercel, Render, APIs públicas).</li>
        </ul>
        <p>
          Nuestra responsabilidad total frente a cualquier reclamo se limita al monto que nos
          hayas pagado en los últimos 12 meses (o cero si usás el plan gratuito).
        </p>
      </Section>

      <Section title="8. Baja de cuenta">
        <p>
          Podés darte de baja cuando quieras escribiendo a{" "}
          <a className="underline text-ink-900" href="mailto:agenciamythf@gmail.com">
            agenciamythf@gmail.com
          </a>. Podemos cerrar una cuenta por violación de estos términos, previa notificación
          salvo en casos de abuso flagrante.
        </p>
      </Section>

      <Section title="9. Ley aplicable y jurisdicción">
        <p>
          Estos términos se rigen por las leyes de la <strong>República Argentina</strong>.
          Cualquier controversia se resolverá en los tribunales ordinarios de la Ciudad
          Autónoma de Buenos Aires, renunciando las partes a cualquier otro fuero que pudiera
          corresponder.
        </p>
      </Section>

      <Section title="10. Contacto">
        <p>
          Dudas sobre estos términos:{" "}
          <a className="underline text-ink-900" href="mailto:agenciamythf@gmail.com">
            agenciamythf@gmail.com
          </a>{" "}
          · <a className="underline text-ink-900" href="https://wa.me/541127398858" target="_blank" rel="noreferrer">+54 11 2739-8858</a>
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg md:text-xl font-bold mb-2">{title}</h2>
      <div className="text-sm md:text-base text-ink-800 space-y-2">{children}</div>
    </section>
  );
}
