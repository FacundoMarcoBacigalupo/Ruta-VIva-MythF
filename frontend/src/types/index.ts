export type UserRole = "consumer" | "fleet_admin" | "admin";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  fleet_id: number | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Incident {
  id: number;
  occurred_at: string;
  province: string | null;
  lat: number;
  lon: number;
  road_type: string | null;
  severity: number;
  fatalities: number;
  injuries: number;
}

export interface HeatmapPoint {
  lat: number;
  lon: number;
  weight: number;
}

export interface HeatmapResponse {
  points: HeatmapPoint[];
  total: number;
}

export type ReportType =
  | "accidente"
  | "bache"
  | "sin_senalizacion"
  | "obra"
  | "inundacion"
  | "niebla"
  | "animales"
  | "otro";

export interface CitizenReport {
  id: number;
  report_type: ReportType;
  description: string | null;
  lat: number;
  lon: number;
  severity: number;
  verified: number;
  reported_at: string;
}

export interface RiskSegment {
  lat: number;
  lon: number;
  risk_score: number;
  factor_breakdown: Record<string, number>;
}

export interface RouteRiskResponse {
  overall_risk: number;
  risk_label: "critico" | "alto" | "medio" | "bajo" | "muy_bajo";
  distance_km: number;
  duration_min: number;
  segments: RiskSegment[];
  recommendations: string[];
  geometry?: any;
  weather: {
    available: boolean;
    current?: Record<string, number>;
    risk_multiplier?: number;
  } | null;
}

export interface GeocodeResult {
  label: string;
  lat: number;
  lon: number;
  province: string | null;
  department: string | null;
  locality: string | null;
}

export interface FleetStats {
  total_vehicles: number;
  routes_analyzed_30d: number;
  avg_risk_30d: number;
  high_risk_trips_30d: number;
  incidents_near_routes: number;
}

export interface Vehicle {
  id: number;
  plate: string;
  model: string | null;
  driver_name: string | null;
}
