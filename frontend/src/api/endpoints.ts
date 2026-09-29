import { api } from "./client";
import type {
  CitizenReport,
  FleetStats,
  GeocodeResult,
  HeatmapResponse,
  Incident,
  ReportType,
  RouteRiskResponse,
  TokenResponse,
  User,
  Vehicle
} from "@/types";

// ---------- Auth ----------
export const authApi = {
  register: (data: { email: string; password: string; full_name?: string; role?: string }) =>
    api<TokenResponse>("/auth/register", { method: "POST", body: data }),
  login: (data: { email: string; password: string }) =>
    api<TokenResponse>("/auth/login", { method: "POST", body: data }),
  me: () => api<User>("/auth/me", { auth: true })
};

// ---------- Incidents ----------
export interface ClusterStats {
  count: number;
  radius_km: number;
  density_label: "muy alta" | "alta" | "media" | "baja" | "muy baja";
  fatalities: number;
  injuries: number;
  severity_avg: number;
  top_road_type: string | null;
  most_recent: {
    occurred_at: string;
    severity: number;
    fatalities: number;
    injuries: number;
  } | null;
  explanation: string;
}
export const incidentsApi = {
  list: (params?: { province?: string; days?: number; limit?: number }) =>
    api<Incident[]>("/incidents", { query: params }),
  heatmap: (bbox: { min_lat: number; max_lat: number; min_lon: number; max_lon: number; days?: number }) =>
    api<HeatmapResponse>("/incidents/heatmap", { query: bbox }),
  cluster: (lat: number, lon: number, radius_km = 0.5) =>
    api<ClusterStats>("/incidents/cluster", { query: { lat, lon, radius_km } }),
};

// ---------- Predict ----------
export const predictApi = {
  route: (body: {
    origin_lat: number;
    origin_lon: number;
    dest_lat: number;
    dest_lon: number;
    waypoints?: Array<{ lat: number; lon: number }>;
    departure_time?: string;
  }) => api<RouteRiskResponse>("/predict/route", { method: "POST", body }),
  point: (body: { lat: number; lon: number; at_time?: string }) =>
    api("/predict/point", { method: "POST", body })
};

// ---------- Geo ----------
export const geoApi = {
  geocode: (q: string) =>
    api<{ results: GeocodeResult[] }>("/geo/geocode", { query: { q } }),
  /** Busca localidades/municipios por nombre (para volar el mapa a una zona). */
  localities: (q: string) =>
    api<{ results: GeocodeResult[] }>("/geo/localities", { query: { q } }),
  /** Reverse geocoding — dado lat/lon devuelve un label legible del lugar. */
  reverse: (lat: number, lon: number) =>
    api<GeocodeResult>("/geo/reverse", { query: { lat, lon } })
};

// ---------- Reports ----------
export const reportsApi = {
  list: (hours = 24) => api<CitizenReport[]>("/reports", { query: { hours } }),
  create: (body: {
    report_type: ReportType;
    description?: string;
    lat: number;
    lon: number;
    severity?: number;
  }) => api<CitizenReport>("/reports", { method: "POST", body, auth: true }),
  verify: (id: number) =>
    api<CitizenReport>(`/reports/${id}/verify`, { method: "POST", auth: true })
};

// ---------- Enterprise / contact ----------
export const enterpriseApi = {
  contact: (body: {
    kind?: "enterprise" | "press" | "general";
    full_name: string;
    email: string;
    phone?: string;
    company?: string;
    role?: string;
    fleet_size?: string;
    message: string;
  }) => api("/enterprise/contact", { method: "POST", body })
};

// ---------- Saved routes ----------
export interface SavedRoute {
  id: number;
  name: string;
  origin_label: string;
  origin_lat: number;
  origin_lon: number;
  dest_label: string;
  dest_lat: number;
  dest_lon: number;
  created_at: string;
}
export const savedRoutesApi = {
  list: () => api<SavedRoute[]>("/saved-routes", { auth: true }),
  create: (body: {
    name: string;
    origin_label: string;
    origin_lat: number;
    origin_lon: number;
    dest_label: string;
    dest_lat: number;
    dest_lon: number;
  }) => api<SavedRoute>("/saved-routes", { method: "POST", body, auth: true }),
  remove: (id: number) => api(`/saved-routes/${id}`, { method: "DELETE", auth: true })
};

// ---------- Admin ----------
export interface AdminStats {
  total_users: number;
  active_users: number;
  total_fleets: number;
  total_reports: number;
  reports_last_24h: number;
  total_incidents: number;
  total_contact_requests: number;
  contact_requests_last_7d: number;
}
export interface AdminUserRow {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  fleet_id: number | null;
  created_at: string;
}
export type ContactStatus = "new" | "contacted" | "in_talks" | "won" | "lost" | "archived";
export interface AdminContactRow {
  id: number;
  kind: string;
  status: ContactStatus;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  role: string | null;
  fleet_size: string | null;
  message: string;
  admin_notes: string | null;
  created_at: string;
}
export interface AdminFleetRow {
  id: number;
  name: string;
  cuit: string | null;
  contact_email: string | null;
  vehicles: number;
  members: number;
  created_at: string;
}
export interface SignupPoint {
  day: string;
  count: number;
}
export interface RoleCount {
  role: string;
  count: number;
}
export interface ReportZone {
  lat: number;
  lon: number;
  count: number;
  top_type: string | null;
}
export interface AnalyticsBundle {
  signup_timeline: SignupPoint[];
  report_timeline: SignupPoint[];
  role_breakdown: RoleCount[];
  top_report_zones: ReportZone[];
  total_push_subscriptions: number;
  total_saved_routes: number;
}

export const adminApi = {
  stats: () => api<AdminStats>("/admin/stats", { auth: true }),
  analytics: () => api<AnalyticsBundle>("/admin/analytics", { auth: true }),
  listUsers: (q?: string) =>
    api<AdminUserRow[]>("/admin/users", { query: { q }, auth: true }),
  createUser: (body: { email: string; password: string; full_name?: string; role: string }) =>
    api<AdminUserRow>("/admin/users", { method: "POST", body, auth: true }),
  updateUser: (id: number, body: { email?: string; full_name?: string; role?: string }) =>
    api<AdminUserRow>(`/admin/users/${id}`, { method: "PATCH", body, auth: true }),
  toggleActive: (id: number) =>
    api<AdminUserRow>(`/admin/users/${id}/toggle-active`, { method: "PATCH", auth: true }),
  deleteUser: (id: number) =>
    api(`/admin/users/${id}`, { method: "DELETE", auth: true }),
  listContactRequests: (filters?: { status?: ContactStatus; kind?: string }) =>
    api<AdminContactRow[]>("/admin/contact-requests", { query: filters, auth: true }),
  updateContactRequest: (id: number, body: { status?: ContactStatus; admin_notes?: string }) =>
    api<AdminContactRow>(`/admin/contact-requests/${id}`, { method: "PATCH", body, auth: true }),
  deleteContactRequest: (id: number) =>
    api(`/admin/contact-requests/${id}`, { method: "DELETE", auth: true }),
  listReports: () => api<CitizenReport[]>("/admin/reports", { auth: true }),
  deleteReport: (id: number) =>
    api(`/admin/reports/${id}`, { method: "DELETE", auth: true }),
  listFleets: () => api<AdminFleetRow[]>("/admin/fleets", { auth: true })
};

// ---------- Push ----------
export const pushApi = {
  vapidPublicKey: () => api<{ public_key: string }>("/push/vapid-public-key"),
  subscribe: (body: {
    endpoint: string;
    p256dh: string;
    auth: string;
    saved_route_id?: number;
  }) => api("/push/subscribe", { method: "POST", body, auth: true }),
  unsubscribe: (endpoint: string) =>
    api("/push/subscribe", { method: "DELETE", body: { endpoint }, auth: true })
};

// ---------- Fleet ----------
export const fleetApi = {
  create: (body: { name: string; cuit?: string; contact_email?: string }) =>
    api("/fleet", { method: "POST", body, auth: true }),
  stats: () => api<FleetStats>("/fleet/stats", { auth: true }),
  listVehicles: () => api<Vehicle[]>("/fleet/vehicles", { auth: true }),
  addVehicle: (body: { plate: string; model?: string; driver_name?: string }) =>
    api<Vehicle>("/fleet/vehicles", { method: "POST", body, auth: true })
};
