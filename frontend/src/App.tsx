import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, type ReactElement } from "react";
import { Layout } from "./components/layout/Layout";
import { ScrollToTop } from "./components/ScrollToTop";
import { Spinner } from "./components/ui/Spinner";
import { useAuth } from "./store/auth";

// Code-splitting: cada página se carga en su propio chunk solo cuando se visita.
const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const MapPage = lazy(() => import("./pages/MapPage").then((m) => ({ default: m.MapPage })));
const RouteCheck = lazy(() => import("./pages/RouteCheck").then((m) => ({ default: m.RouteCheck })));
const NavigatePage = lazy(() => import("./pages/Navigate").then((m) => ({ default: m.NavigatePage })));
const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Register = lazy(() => import("./pages/Register").then((m) => ({ default: m.Register })));
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const ReportPage = lazy(() => import("./pages/ReportPage").then((m) => ({ default: m.ReportPage })));
const Enterprise = lazy(() => import("./pages/Enterprise").then((m) => ({ default: m.Enterprise })));
const Press = lazy(() => import("./pages/Press").then((m) => ({ default: m.Press })));
const Privacy = lazy(() => import("./pages/Privacy").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("./pages/Terms").then((m) => ({ default: m.Terms })));
const AdminPanel = lazy(() => import("./pages/Admin").then((m) => ({ default: m.AdminPanel })));

function Protected({ children, role }: { children: ReactElement; role?: "admin" | "fleet_admin" }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (role && user?.role !== role && user?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-live="polite">
      <Spinner className="w-8 h-8" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <ScrollToTop />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/ruta" element={<RouteCheck />} />
          <Route path="/navegar" element={<NavigatePage />} />
          <Route path="/empresas" element={<Enterprise />} />
          <Route path="/prensa" element={<Press />} />
          <Route path="/privacidad" element={<Privacy />} />
          <Route path="/terminos" element={<Terms />} />
          <Route path="/reportar" element={<Protected><ReportPage /></Protected>} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/admin" element={<Protected role="admin"><AdminPanel /></Protected>} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
