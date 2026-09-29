import { useMeta } from "@/hooks/useMeta";

export function Privacy() {
  useMeta({
    title: "Política de privacidad",
    description: "Cómo tratamos tus datos personales en RutaVivaMythF conforme a la Ley 25.326 de Argentina."
  });

  return (
    <article className="max-w-3xl mx-auto px-4 py-10 md:py-16 prose-like space-y-6">
      <header>
        <h1 className="text-3xl md:text-4xl font-extrabold">Política de privacidad</h1>
        <p className="text-xs text-brand-500 mt-2">Última actualización: abril de 2026</p>
      </header>

      <Section title="1. Responsable del tratamiento">
        <p>
          El responsable del tratamiento de los datos personales recogidos a través del sitio
          <strong> rutaviva.mythf.site </strong>es la agencia <strong>MythF</strong>, con base
          en Argentina y contacto en{" "}
          <a className="underline text-ink-900" href="mailto:agenciamythf@gmail.com">agenciamythf@gmail.com</a>.
        </p>
      </Section>

      <Section title="2. Marco legal">
        <p>
          Esta política cumple con la <strong>Ley N° 25.326 de Protección de los Datos Personales</strong>{" "}
          de la República Argentina y su Decreto Reglamentario 1558/2001.
        </p>
      </Section>

      <Section title="3. Qué datos recolectamos">
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Cuenta:</strong> email y contraseña. Opcionalmente, nombre completo.</li>
          <li><strong>Rutas consultadas:</strong> origen y destino de las rutas que analizás. No vinculadas a tu cuenta salvo que las guardes explícitamente.</li>
          <li><strong>Reportes ciudadanos:</strong> tipo, descripción, ubicación (latitud/longitud) que vos elegís compartir.</li>
          <li><strong>Ubicación en vivo durante navegación:</strong> procesada únicamente en tu dispositivo, no almacenada en nuestros servidores.</li>
          <li><strong>Datos de flota (B2B):</strong> nombre, CUIT, vehículos, conductores, rutas operativas.</li>
          <li><strong>Formulario de contacto:</strong> nombre, email, teléfono (opcional), empresa y mensaje.</li>
        </ul>
      </Section>

      <Section title="4. Para qué los usamos">
        <ul className="list-disc pl-6 space-y-1">
          <li>Prestar el servicio: calcular score de riesgo, guardar tus rutas, mostrar reportes en vivo.</li>
          <li>Mejorar el modelo predictivo mediante datos agregados y anonimizados.</li>
          <li>Contactarte si completaste el formulario de empresas o prensa.</li>
        </ul>
      </Section>

      <Section title="5. Con quién los compartimos">
        <p>Proveedores con los que trabajamos:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Vercel</strong></li>
          <li><strong>Render</strong></li>
          <li><strong>Hostinger</strong></li>
          <li><strong>Open-Meteo</strong></li>
          <li><strong>OSRM</strong></li>
          <li><strong>Georef</strong></li>
        </ul>
        <p>No vendemos datos personales a terceros ni los usamos para publicidad comportamental.</p>
      </Section>

      <Section title="6. Cookies">
        <p>
          Usamos exclusivamente cookies técnicas esenciales (sesión JWT en localStorage).
          No instalamos cookies publicitarias, de tracking ni de redes sociales.
        </p>
      </Section>

      <Section title="7. Retención">
        <p>
          Mantenemos tu cuenta y datos asociados mientras la uses. Si pedís la baja, eliminamos
          todo en un plazo máximo de 30 días (salvo obligaciones legales de retención).
        </p>
      </Section>

      <Section title="8. Seguridad">
        <p>
          Todos los datos se almacenan y transmiten de forma cifrada. Aplicamos las prácticas
          estándar de seguridad de la industria para proteger tu información.
        </p>
      </Section>

      <Section title="9. Menores de edad">
        <p>
          El servicio está dirigido a mayores de 18 años. Si detectamos una cuenta de un menor,
          la cerramos y eliminamos sus datos.
        </p>
      </Section>

      <Section title="10. Cambios">
        <p>
          Si modificamos esta política te avisamos por email (si tenés cuenta) al menos 15 días
          antes de que entren en vigor los cambios sustanciales.
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
