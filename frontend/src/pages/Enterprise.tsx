import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { enterpriseApi } from "@/api/endpoints";
import { Spinner } from "@/components/ui/Spinner";
import { useMeta } from "@/hooks/useMeta";

const FLEET_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

export function Enterprise() {
  useMeta({
    title: "Para empresas y flotas",
    description:
      "Reducí la siniestralidad de tu flota 15-25%. Dashboard B2B, API REST y scoring de riesgo por ruta en tiempo real."
  });

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    company: "",
    role: "",
    fleet_size: "",
    message: ""
  });
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: enterpriseApi.contact,
    onSuccess: () => setSent(true)
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      kind: "enterprise",
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || undefined,
      company: form.company || undefined,
      role: form.role || undefined,
      fleet_size: form.fleet_size || undefined,
      message: form.message
    });
  };

  return (
    <div>
      <section className="bg-ink-900 text-cream">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1 text-xs font-semibold bg-white/5 text-cream rounded-full border border-white/15">
              Para empresas y flotas
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold leading-tight">
              Reducí la siniestralidad de tu flota <span className="text-cream-300 underline decoration-cream-300/40 decoration-4 underline-offset-4">15-25%</span>.
            </h1>
            <p className="mt-4 text-cream-300/90 md:text-lg">
              Integrá el scoring predictivo de RutaViva a tus operaciones: API REST, dashboard B2B,
              alertas automáticas y reportes para aseguradoras. Pensado para logística, seguros,
              apps de movilidad y flotas corporativas.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#contacto" className="btn bg-cream text-ink-900 hover:bg-cream-300 text-base">Hablemos</a>
              <a href="https://wa.me/541127398858" target="_blank" rel="noreferrer" className="btn border border-cream/30 text-cream hover:bg-white/5 text-base">
                WhatsApp directo
              </a>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="rounded-xl bg-gradient-to-br from-brand-800 to-ink-900 border border-white/10 p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-4xl font-extrabold">-22%</div>
                  <div className="text-xs uppercase tracking-wide text-cream-400">siniestros promedio piloto</div>
                </div>
                <div>
                  <div className="text-4xl font-extrabold">4.000+</div>
                  <div className="text-xs uppercase tracking-wide text-cream-400">muertes viales/año AR</div>
                </div>
                <div>
                  <div className="text-4xl font-extrabold">&lt;200ms</div>
                  <div className="text-xs uppercase tracking-wide text-cream-400">latencia API</div>
                </div>
                <div>
                  <div className="text-4xl font-extrabold">99.9%</div>
                  <div className="text-xs uppercase tracking-wide text-cream-400">uptime objetivo</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold mb-8">¿Qué te damos?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Feature
            num="1"
            title="Scoring por ruta y por conductor"
            body="Cada viaje recibe un score 0-100 con descomposición por factor: histórico, clima, reportes vivos, hora. Auditable y explicable para reportes a seguros."
          />
          <Feature
            num="2"
            title="API REST + webhooks"
            body="Integrala a tu TMS, app propia o telemática. Tokens rotables, documentación OpenAPI, rate limits por plan."
          />
          <Feature
            num="3"
            title="Dashboard multi-flota"
            body="Administración de vehículos, conductores, rutas guardadas, viajes analizados, y métricas agregadas 30 días."
          />
          <Feature
            num="4"
            title="Alertas en tiempo real"
            body="Cuando un vehículo entra en zona de riesgo alto, podés recibir webhook / email / WhatsApp automático."
          />
          <Feature
            num="5"
            title="Export a tu aseguradora"
            body="PDF + CSV con resumen mensual por vehículo. Listo para presentar en negociación de prima."
          />
          <Feature
            num="6"
            title="White-label opcional"
            body="Para brokers y aseguradoras que quieran ofrecer la herramienta a sus clientes bajo su marca."
          />
        </div>
      </section>

      <section className="bg-white border-y border-brand-200">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h3 className="font-bold mb-6">Pensado para</h3>
          <div className="grid md:grid-cols-4 gap-6 text-sm">
            <UseCase title="Logística" body="Mercado Libre Logística, Andreani, Oca, transportistas locales — optimización de rutas con criterio de seguridad." />
            <UseCase title="Aseguradoras" body="Sancor, La Segunda, San Cristóbal, Allianz AR — pricing dinámico y reducción de payouts." />
            <UseCase title="Apps de movilidad" body="Uber, Cabify, DiDi, apps de delivery — proteger al conductor y bajar CAC de soporte." />
            <UseCase title="Flotas corporativas" body="YPF Ruta, empresas con 50+ vehículos operativos — compliance y reducción de costos." />
          </div>
        </div>
      </section>

      <section id="contacto" className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold">Hablemos</h2>
        <p className="text-brand-500 mt-2">Dejanos tu contacto y te respondemos en menos de 24 horas hábiles.</p>

        {sent ? (
          <div className="card p-8 mt-6 text-center">
            <div className="text-5xl mb-3">✉️</div>
            <h3 className="text-xl font-bold">¡Recibimos tu mensaje!</h3>
            <p className="text-brand-500 mt-2">Te escribimos a <strong className="text-ink-900">{form.email}</strong> en las próximas horas.</p>
            <p className="text-xs text-brand-500 mt-4">
              Si es urgente: <a className="text-ink-900 underline" href="https://wa.me/541127398858" target="_blank" rel="noreferrer">WhatsApp +54 11 2739-8858</a>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="card p-6 mt-6 grid md:grid-cols-2 gap-4">
            <Field label="Nombre completo" required>
              <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            <Field label="Email corporativo" required>
              <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Empresa">
              <input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </Field>
            <Field label="Cargo">
              <input className="input" placeholder="Ej: Director de Operaciones" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            </Field>
            <Field label="Teléfono (opcional)">
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Tamaño de flota">
              <select className="input" value={form.fleet_size} onChange={(e) => setForm({ ...form, fleet_size: e.target.value })}>
                <option value="">Seleccionar</option>
                {FLEET_SIZES.map((s) => <option key={s} value={s}>{s} vehículos</option>)}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Contanos tu caso" required>
                <textarea
                  className="input min-h-[120px] max-h-[300px] resize-y"
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="¿Qué resolvés hoy y qué querrías integrar?"
                />
              </Field>
            </div>
            <div className="md:col-span-2 flex items-center justify-between gap-3">
              <p className="text-xs text-brand-500">
                Al enviar aceptás nuestra <a href="/privacidad" className="underline">política de privacidad</a>.
              </p>
              <button type="submit" disabled={mutation.isPending} className="btn-primary">
                {mutation.isPending ? <><Spinner className="mr-2" /> Enviando…</> : "Enviar"}
              </button>
            </div>
            {mutation.isError && (
              <p className="md:col-span-2 text-sm text-red-600">{(mutation.error as Error).message}</p>
            )}
          </form>
        )}
      </section>
    </div>
  );
}

function Feature({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="card p-6">
      <div className="w-10 h-10 rounded-lg bg-cream-200 text-ink-900 font-bold flex items-center justify-center">{num}</div>
      <h3 className="mt-4 font-semibold text-lg">{title}</h3>
      <p className="mt-2 text-sm text-brand-500">{body}</p>
    </div>
  );
}

function UseCase({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h4 className="font-semibold text-ink-900">{title}</h4>
      <p className="text-brand-500 mt-1">{body}</p>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-600 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}
