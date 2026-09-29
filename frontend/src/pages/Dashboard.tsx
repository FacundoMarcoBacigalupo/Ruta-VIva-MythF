import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fleetApi } from "@/api/endpoints";
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMeta } from "@/hooks/useMeta";

export function Dashboard() {
  useMeta({ title: "Dashboard de flota", noindex: true });
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["fleet-stats"], queryFn: fleetApi.stats });
  const vehicles = useQuery({ queryKey: ["fleet-vehicles"], queryFn: fleetApi.listVehicles });

  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [driver, setDriver] = useState("");

  const addVehicle = useMutation({
    mutationFn: fleetApi.addVehicle,
    onSuccess: () => {
      setPlate(""); setModel(""); setDriver("");
      qc.invalidateQueries({ queryKey: ["fleet-vehicles"] });
      qc.invalidateQueries({ queryKey: ["fleet-stats"] });
    }
  });

  const chartData = [
    { name: "Vehículos", value: stats.data?.total_vehicles ?? 0 },
    { name: "Rutas 30d", value: stats.data?.routes_analyzed_30d ?? 0 },
    { name: "Riesgo alto 30d", value: stats.data?.high_risk_trips_30d ?? 0 },
    { name: "Siniestros cerca", value: stats.data?.incidents_near_routes ?? 0 }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard de flota</h1>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Vehículos" value={stats.data?.total_vehicles ?? 0} />
        <Stat label="Rutas analizadas 30d" value={stats.data?.routes_analyzed_30d ?? 0} />
        <Stat label="Riesgo promedio 30d" value={stats.data?.avg_risk_30d ?? 0} />
        <Stat label="Viajes críticos 30d" value={stats.data?.high_risk_trips_30d ?? 0} />
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Resumen operativo</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0a0a0a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Agregar vehículo</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!plate) return;
              addVehicle.mutate({ plate, model: model || undefined, driver_name: driver || undefined });
            }}
            className="space-y-3"
          >
            <input className="input" placeholder="Patente" value={plate} onChange={(e) => setPlate(e.target.value)} />
            <input className="input" placeholder="Modelo (opcional)" value={model} onChange={(e) => setModel(e.target.value)} />
            <input className="input" placeholder="Conductor (opcional)" value={driver} onChange={(e) => setDriver(e.target.value)} />
            <button disabled={addVehicle.isPending} className="btn-primary w-full">
              {addVehicle.isPending ? "Guardando…" : "Agregar"}
            </button>
            {addVehicle.isError && (
              <p className="text-sm text-red-600">{(addVehicle.error as Error).message}</p>
            )}
          </form>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-3">Flota</h3>
          {vehicles.isLoading && <p className="text-sm text-brand-500">Cargando…</p>}
          {vehicles.data && vehicles.data.length === 0 && (
            <p className="text-sm text-brand-500">Aún no agregaste vehículos.</p>
          )}
          <ul className="divide-y divide-slate-100">
            {(vehicles.data ?? []).map((v) => (
              <li key={v.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{v.plate}</div>
                  <div className="text-xs text-brand-500">{v.model ?? "—"} · {v.driver_name ?? "Sin conductor"}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-brand-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{typeof value === "number" ? value.toLocaleString("es-AR") : value}</div>
    </div>
  );
}
