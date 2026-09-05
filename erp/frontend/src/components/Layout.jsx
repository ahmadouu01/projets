import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Tableau de bord", icon: "📊", end: true },
  { to: "/clients", label: "Clients & Sites", icon: "🏢" },
  { to: "/contrats", label: "Contrats", icon: "📄" },
  { to: "/facturation", label: "Facturation", icon: "💳" },
  { to: "/stock", label: "Stock & Production", icon: "🧺" },
  { to: "/tournees", label: "Tournées & Logistique", icon: "🚚" },
  { to: "/rh", label: "RH & Paie", icon: "👥" },
];

const ROLE_LABELS = {
  ADMIN: "Administrateur",
  COMMERCIAL: "Commercial",
  LOGISTIQUE: "Logistique",
  PRODUCTION: "Production",
  COMPTABILITE: "Comptabilité",
  RH: "Ressources Humaines",
};

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <strong>ERP Teranga</strong>
          <span>Location-entretien &amp; hygiène</span>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div>{user?.name}</div>
          <div className="text-muted">{ROLE_LABELS[user?.role] || user?.role}</div>
          <button onClick={logout}>Se déconnecter</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
