import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { useEffect, useState, type ReactNode } from "react";

function navClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-2 rounded-lg text-sm font-medium ${
    isActive ? "bg-ink-900 text-cream" : "text-ink-800 hover:bg-cream-100"
  }`;
}

function mobileNavClass({ isActive }: { isActive: boolean }) {
  return `block px-4 py-3 rounded-lg text-base font-medium ${
    isActive ? "bg-ink-900 text-cream" : "text-ink-800 hover:bg-cream-100"
  }`;
}

export function Layout({ children }: { children: ReactNode }) {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-brand-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-ink-900" onClick={() => setMenuOpen(false)}>
            <span className="inline-block w-7 h-7 rounded-md bg-ink-900 flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-5 h-5">
                <path d="M14 46 L28 18 L36 30 L50 18" stroke="#ffffff" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="50" cy="18" r="4" fill="#ffffff" />
              </svg>
            </span>
            <span className="hidden xs:inline">RutaViva<span className="text-brand-500">MythF</span></span>
            <span className="xs:hidden">RV<span className="text-brand-500">MythF</span></span>{/* accent kept as mid-gray (b&w family) */}
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navClass}>Inicio</NavLink>
            <NavLink to="/mapa" className={navClass}>Mapa</NavLink>
            <NavLink to="/ruta" className={navClass}>Analizar ruta</NavLink>
            <NavLink to="/empresas" className={navClass}>Empresas</NavLink>
            {token && <NavLink to="/reportar" className={navClass}>Reportar</NavLink>}
            {user?.role === "fleet_admin" && <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>}
            {user?.role === "admin" && <NavLink to="/admin" className={navClass}>Admin</NavLink>}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {token ? (
              <>
                <span className="hidden lg:inline text-xs text-brand-500">{user?.email}</span>
                <button onClick={handleLogout} className="btn-secondary">Salir</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Ingresar</Link>
                <Link to="/registro" className="btn-primary">Registrarse</Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 -mr-2 rounded-lg hover:bg-cream-100"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16"
                style={{
                  transformOrigin: "12px 6px",
                  transform: menuOpen ? "translate(0,6px) rotate(45deg)" : "none",
                  transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 12h16"
                style={{
                  transformOrigin: "center",
                  opacity: menuOpen ? 0 : 1,
                  transform: menuOpen ? "scaleX(0)" : "none",
                  transition: "opacity 200ms ease, transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 18h16"
                style={{
                  transformOrigin: "12px 18px",
                  transform: menuOpen ? "translate(0,-6px) rotate(-45deg)" : "none",
                  transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            </svg>
          </button>
        </div>

        <div
          id="mobile-menu"
          className={`md:hidden grid overflow-hidden ${menuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          aria-hidden={!menuOpen}
          style={{
            transitionProperty: "grid-template-rows, opacity",
            transitionDuration: "320ms",
            transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div className="min-h-0 border-t border-brand-200 bg-white">
            <div className="max-h-[calc(100vh-3.5rem)] overflow-y-auto p-3 space-y-1">
              <NavLink to="/" end className={mobileNavClass} onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1}>Inicio</NavLink>
              <NavLink to="/mapa" className={mobileNavClass} onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1}>Mapa</NavLink>
              <NavLink to="/ruta" className={mobileNavClass} onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1}>Analizar ruta</NavLink>
              <NavLink to="/empresas" className={mobileNavClass} onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1}>Empresas</NavLink>
              {token && <NavLink to="/reportar" className={mobileNavClass} onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1}>Reportar</NavLink>}
              {user?.role === "fleet_admin" && <NavLink to="/dashboard" className={mobileNavClass} onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1}>Dashboard</NavLink>}
              {user?.role === "admin" && <NavLink to="/admin" className={mobileNavClass} onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1}>Admin</NavLink>}
              <div className="border-t border-brand-200 my-2" />
              {token ? (
                <>
                  <div className="px-4 py-2 text-xs text-brand-500">Sesión: {user?.email}</div>
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-3 rounded-lg text-base font-medium hover:bg-cream-100" tabIndex={menuOpen ? 0 : -1}>
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className={mobileNavClass({ isActive: false })} onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1}>Ingresar</Link>
                  <Link to="/registro" className="btn-primary w-full justify-center mt-2" onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1}>Registrarse</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-brand-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-3 text-xs text-brand-500">
          <div className="flex flex-wrap items-center justify-center md:justify-between gap-x-4 gap-y-2 text-center md:text-left">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 justify-center md:justify-start">
              <span>© {new Date().getFullYear()} RutaVivaMythF — un proyecto de</span>
              <a
                className="inline-flex items-center gap-1.5 font-semibold text-ink-900 hover:text-ink-800"
                href="https://mythf.site"
                target="_blank"
                rel="noreferrer"
              >
                <span className="inline-block w-4 h-4 rounded-sm bg-ink-900 flex items-center justify-center">
                  <svg viewBox="0 0 64 64" className="w-3 h-3">
                    <path d="M14 46 L28 18 L36 30 L50 18" stroke="#ffffff" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                MythF
              </a>
              <span className="text-brand-300">·</span>
              <a
                className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-cream-100 text-ink-900 hover:bg-cream-200 border border-brand-200"
                href="https://mythf.site"
                target="_blank"
                rel="noreferrer"
              >
                mythf.site
              </a>
            </span>
            <span>Datos: ANSV / datos.gob.ar · Open-Meteo · OpenStreetMap</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1">
            <Link to="/empresas" className="hover:text-ink-900">Empresas</Link>
            <Link to="/prensa" className="hover:text-ink-900">Prensa</Link>
            <Link to="/privacidad" className="hover:text-ink-900">Privacidad</Link>
            <Link to="/terminos" className="hover:text-ink-900">Términos</Link>
            <a href="mailto:agenciamythf@gmail.com" className="hover:text-ink-900">Contacto</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
