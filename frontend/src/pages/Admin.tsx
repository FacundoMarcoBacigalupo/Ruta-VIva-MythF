import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApi,
  type AdminContactRow,
  type AdminUserRow,
  type ContactStatus
} from "@/api/endpoints";
import { useMeta } from "@/hooks/useMeta";
import { formatDate, reportTypeText } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import { BarChart, Bar, LineChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

type Tab = "stats" | "analytics" | "users" | "contacts" | "fleets" | "reports";

const TABS: { key: Tab; label: string }[] = [
  { key: "stats", label: "Métricas" },
  { key: "analytics", label: "Análisis" },
  { key: "users", label: "Usuarios" },
  { key: "contacts", label: "Leads B2B" },
  { key: "fleets", label: "Flotas" },
  { key: "reports", label: "Reportes" }
];

export function AdminPanel() {
  useMeta({ title: "Admin", noindex: true });
  const [tab, setTab] = useState<Tab>("stats");

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <p className="text-sm text-brand-500">Sólo usuarios con rol <code className="bg-cream-100 px-1 rounded">admin</code>.</p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-brand-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key ? "border-ink-900 text-ink-900" : "border-transparent text-brand-500 hover:text-ink-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "stats" && <StatsTab />}
      {tab === "analytics" && <AnalyticsTab />}
      {tab === "users" && <UsersTab />}
      {tab === "contacts" && <ContactsTab />}
      {tab === "fleets" && <FleetsTab />}
      {tab === "reports" && <ReportsTab />}
    </div>
  );
}

// ============================================================================
// Métricas
// ============================================================================
function StatsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: adminApi.stats });
  if (isLoading) return <p className="text-sm text-brand-500">Cargando…</p>;
  if (!data) return null;
  const cards = [
    ["Usuarios totales", data.total_users],
    ["Usuarios activos", data.active_users],
    ["Flotas", data.total_fleets],
    ["Reportes totales", data.total_reports],
    ["Reportes 24h", data.reports_last_24h],
    ["Siniestros en base", data.total_incidents],
    ["Leads totales", data.total_contact_requests],
    ["Leads 7d", data.contact_requests_last_7d]
  ] as const;
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(([label, value]) => (
        <div key={label} className="card p-4">
          <div className="text-xs uppercase tracking-wide text-brand-500">{label}</div>
          <div className="text-2xl font-bold mt-1">{value.toLocaleString("es-AR")}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Análisis (gráficos + zonas calientes)
// ============================================================================
const PIE_COLORS = ["#0a0a0a", "#696969", "#a0a0a0", "#d4d4d4"];

function AnalyticsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-analytics"], queryFn: adminApi.analytics });
  if (isLoading) return <p className="text-sm text-brand-500">Cargando…</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-brand-500">Rutas guardadas totales</div>
          <div className="text-2xl font-bold mt-1">{data.total_saved_routes.toLocaleString("es-AR")}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-brand-500">Suscripciones a push</div>
          <div className="text-2xl font-bold mt-1">{data.total_push_subscriptions.toLocaleString("es-AR")}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Registros por día (30d)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.signup_timeline}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0a0a0a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-3">Reportes ciudadanos por día (30d)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.report_timeline}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0a0a0a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Distribución de roles</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.role_breakdown}
                  dataKey="count"
                  nameKey="role"
                  outerRadius={70}
                  innerRadius={35}
                  label={({ role, count }) => `${role}: ${count}`}
                >
                  {data.role_breakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-3">Zonas calientes de reportes</h3>
          <p className="text-xs text-brand-500 mb-2">Clusters por ~1 km². Donde más ciudadanos están reportando.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-brand-500">
                <tr>
                  <th className="text-left py-1">#</th>
                  <th className="text-left py-1">Lat, Lon</th>
                  <th className="text-left py-1">Tipo más reportado</th>
                  <th className="text-right py-1">Reportes</th>
                  <th className="text-right py-1"></th>
                </tr>
              </thead>
              <tbody>
                {data.top_report_zones.map((z, i) => (
                  <tr key={i} className="border-t border-brand-100">
                    <td className="py-1.5">{i + 1}</td>
                    <td className="py-1.5 font-mono text-xs">{z.lat.toFixed(2)}, {z.lon.toFixed(2)}</td>
                    <td className="py-1.5">{z.top_type ? reportTypeText(z.top_type) : "—"}</td>
                    <td className="py-1.5 text-right font-semibold">{z.count}</td>
                    <td className="py-1.5 text-right">
                      <a
                        className="text-xs underline text-ink-900"
                        href={`https://www.openstreetmap.org/?mlat=${z.lat}&mlon=${z.lon}#map=14/${z.lat}/${z.lon}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ver
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Usuarios — crear, editar, toggle, borrar
// ============================================================================
function UsersTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => adminApi.listUsers(q || undefined)
  });

  const toggle = useMutation({
    mutationFn: adminApi.toggleActive,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] })
  });
  const del = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] })
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="input max-w-md"
          placeholder="Buscar por email o nombre"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + Crear usuario
        </button>
      </div>

      {isLoading && <p className="text-sm text-brand-500">Cargando…</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-brand-500 uppercase text-xs">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Rol</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Alta</th>
              <th className="text-right p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((u) => (
              <tr key={u.id} className="border-t border-brand-100">
                <td className="p-3">{u.id}</td>
                <td className="p-3 font-mono text-xs">{u.email}</td>
                <td className="p-3">{u.full_name ?? "—"}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${u.role === "admin" ? "bg-ink-900 text-cream" : "bg-cream-100 text-ink-900"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${u.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                    {u.is_active ? "activo" : "inactivo"}
                  </span>
                </td>
                <td className="p-3 text-xs text-brand-500">{formatDate(u.created_at)}</td>
                <td className="p-3 text-right space-x-1 whitespace-nowrap">
                  <button className="btn-ghost text-xs" onClick={() => setEditing(u)}>
                    Editar
                  </button>
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => toggle.mutate(u.id)}
                    disabled={u.role === "admin"}
                  >
                    {u.is_active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    className="btn-ghost text-xs text-red-600"
                    onClick={() => {
                      if (confirm(`¿Borrar ${u.email}?`)) del.mutate(u.id);
                    }}
                    disabled={u.role === "admin"}
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "consumer" });

  const mut = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      onClose();
    }
  });

  return (
    <Modal title="Crear usuario" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate({
            email: form.email,
            password: form.password,
            full_name: form.full_name || undefined,
            role: form.role
          });
        }}
        className="space-y-3"
      >
        <Field label="Email">
          <input type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Contraseña (10+, mayúscula, minúscula, número)">
          <input type="text" required minLength={10} className="input font-mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Field label="Nombre (opcional)">
          <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="Rol">
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="consumer">consumer</option>
            <option value="fleet_admin">fleet_admin</option>
            <option value="admin">admin</option>
          </select>
        </Field>
        {mut.isError && <p className="text-sm text-red-600">{(mut.error as Error).message}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button disabled={mut.isPending} className="btn-primary">
            {mut.isPending ? <><Spinner className="mr-2" /> Creando…</> : "Crear"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    email: user.email,
    full_name: user.full_name ?? "",
    role: user.role
  });

  const mut = useMutation({
    mutationFn: (body: { email?: string; full_name?: string; role?: string }) =>
      adminApi.updateUser(user.id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      onClose();
    }
  });

  return (
    <Modal title={`Editar usuario #${user.id}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate({
            email: form.email !== user.email ? form.email : undefined,
            full_name: form.full_name !== (user.full_name ?? "") ? form.full_name : undefined,
            role: form.role !== user.role ? form.role : undefined
          });
        }}
        className="space-y-3"
      >
        <Field label="Email">
          <input type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Nombre">
          <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="Rol">
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="consumer">consumer</option>
            <option value="fleet_admin">fleet_admin</option>
            <option value="admin">admin</option>
          </select>
        </Field>
        {mut.isError && <p className="text-sm text-red-600">{(mut.error as Error).message}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button disabled={mut.isPending} className="btn-primary">
            {mut.isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// Leads B2B — status workflow + CSV export + delete
// ============================================================================
const STATUS_BADGE: Record<ContactStatus, string> = {
  new: "bg-sky-50 text-sky-700 border-sky-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  in_talks: "bg-violet-50 text-violet-700 border-violet-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-red-50 text-red-700 border-red-200",
  archived: "bg-brand-100 text-brand-500 border-brand-200"
};

const STATUS_LABEL: Record<ContactStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  in_talks: "En charlas",
  won: "Ganado",
  lost: "Perdido",
  archived: "Archivado"
};

function ContactsTab() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<ContactStatus | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-contacts", filterStatus],
    queryFn: () =>
      adminApi.listContactRequests(filterStatus !== "all" ? { status: filterStatus } : undefined)
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { status?: ContactStatus; admin_notes?: string } }) =>
      adminApi.updateContactRequest(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-contacts"] })
  });
  const del = useMutation({
    mutationFn: adminApi.deleteContactRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-contacts"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    }
  });

  const exportCsv = () => {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["id", "kind", "status", "full_name", "email", "phone", "company", "role", "fleet_size", "message", "admin_notes", "created_at"]
    ];
    for (const c of data) {
      rows.push([
        c.id, c.kind, c.status, c.full_name, c.email, c.phone ?? "", c.company ?? "", c.role ?? "", c.fleet_size ?? "", c.message, c.admin_notes ?? "", c.created_at
      ]);
    }
    const csv = rows
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="input max-w-xs"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ContactStatus | "all")}
        >
          <option value="all">Todos los estados</option>
          {(Object.keys(STATUS_LABEL) as ContactStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <button onClick={exportCsv} disabled={!data?.length} className="btn-secondary ml-auto">
          ⬇ Exportar CSV
        </button>
      </div>

      {isLoading && <p className="text-sm text-brand-500">Cargando…</p>}
      {data && data.length === 0 && <p className="text-sm text-brand-500">Sin leads con ese filtro.</p>}

      <div className="space-y-3">
        {(data ?? []).map((c) => (
          <ContactCard
            key={c.id}
            contact={c}
            onStatus={(status) => update.mutate({ id: c.id, body: { status } })}
            onNotes={(admin_notes) => update.mutate({ id: c.id, body: { admin_notes } })}
            onDelete={() => {
              if (confirm(`¿Borrar lead de ${c.full_name}?`)) del.mutate(c.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ContactCard({
  contact,
  onStatus,
  onNotes,
  onDelete
}: {
  contact: AdminContactRow;
  onStatus: (s: ContactStatus) => void;
  onNotes: (n: string) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(contact.admin_notes ?? "");
  const notesChanged = notes !== (contact.admin_notes ?? "");

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{contact.full_name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_BADGE[contact.status]}`}>
              {STATUS_LABEL[contact.status]}
            </span>
            <span className="text-xs text-brand-500">· {contact.kind}</span>
          </div>
          <div className="text-xs text-brand-500 mt-1">
            <a className="text-ink-900 underline" href={`mailto:${contact.email}`}>{contact.email}</a>
            {contact.phone && <> · <a className="text-ink-900 underline" href={`tel:${contact.phone}`}>{contact.phone}</a></>}
            {contact.company && <> · {contact.company}</>}
            {contact.role && <> · {contact.role}</>}
            {contact.fleet_size && <> · {contact.fleet_size} vehículos</>}
          </div>
        </div>
        <span className="text-xs text-brand-500">{formatDate(contact.created_at)}</span>
      </div>

      <p className="text-sm bg-cream-100 rounded p-3 whitespace-pre-wrap">{contact.message}</p>

      <div className="grid md:grid-cols-[180px_1fr_auto] gap-2 items-start">
        <select
          className="input text-sm"
          value={contact.status}
          onChange={(e) => onStatus(e.target.value as ContactStatus)}
        >
          {(Object.keys(STATUS_LABEL) as ContactStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <textarea
          className="input text-sm min-h-[40px]"
          placeholder="Notas privadas (sólo las ves vos)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={() => onNotes(notes)}
            disabled={!notesChanged}
            className="btn-secondary text-sm"
          >
            Guardar nota
          </button>
          <button onClick={onDelete} className="btn-ghost text-sm text-red-600">
            Borrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Flotas
// ============================================================================
function FleetsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-fleets"], queryFn: adminApi.listFleets });
  if (isLoading) return <p className="text-sm text-brand-500">Cargando…</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-cream-100 text-brand-500 uppercase text-xs">
          <tr>
            <th className="text-left p-3">ID</th>
            <th className="text-left p-3">Nombre</th>
            <th className="text-left p-3">CUIT</th>
            <th className="text-left p-3">Email</th>
            <th className="text-right p-3">Vehículos</th>
            <th className="text-right p-3">Miembros</th>
            <th className="text-left p-3">Alta</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).length === 0 && (
            <tr><td colSpan={7} className="p-6 text-center text-sm text-brand-500">Sin flotas todavía.</td></tr>
          )}
          {(data ?? []).map((f) => (
            <tr key={f.id} className="border-t border-brand-100">
              <td className="p-3">{f.id}</td>
              <td className="p-3 font-semibold">{f.name}</td>
              <td className="p-3 font-mono text-xs">{f.cuit ?? "—"}</td>
              <td className="p-3">{f.contact_email ?? "—"}</td>
              <td className="p-3 text-right">{f.vehicles}</td>
              <td className="p-3 text-right">{f.members}</td>
              <td className="p-3 text-xs text-brand-500">{formatDate(f.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Reportes ciudadanos (moderación)
// ============================================================================
function ReportsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: adminApi.listReports
  });
  const del = useMutation({
    mutationFn: adminApi.deleteReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reports"] })
  });
  const total = useMemo(() => (data ?? []).length, [data]);
  if (isLoading) return <p className="text-sm text-brand-500">Cargando…</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-brand-500">{total} reportes totales. Borrá los que sean spam o engañosos.</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-100 text-brand-500 uppercase text-xs">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">Descripción</th>
              <th className="text-left p-3">Ubicación</th>
              <th className="text-left p-3">Severidad</th>
              <th className="text-left p-3">Verif.</th>
              <th className="text-left p-3">Fecha</th>
              <th className="text-right p-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={r.id} className="border-t border-brand-100">
                <td className="p-3">{r.id}</td>
                <td className="p-3">{reportTypeText(r.report_type)}</td>
                <td className="p-3 max-w-md truncate">{r.description ?? "—"}</td>
                <td className="p-3 text-xs text-brand-500 font-mono">{r.lat.toFixed(3)}, {r.lon.toFixed(3)}</td>
                <td className="p-3">{r.severity}</td>
                <td className="p-3">{r.verified}</td>
                <td className="p-3 text-xs text-brand-500">{formatDate(r.reported_at)}</td>
                <td className="p-3 text-right">
                  <button
                    className="btn-ghost text-xs text-red-600"
                    onClick={() => { if (confirm("¿Borrar reporte?")) del.mutate(r.id); }}
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// UI helpers
// ============================================================================
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md p-6 animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-brand-500 hover:text-ink-900 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
