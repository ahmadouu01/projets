import { useFetch } from "../hooks/useApi";
import { formatFcfa } from "../utils/format";

const STATUS_LABELS = {
  EN_STOCK: "En stock",
  EN_SERVICE: "En service chez le client",
  EN_LAVAGE: "En lavage",
  HORS_SERVICE: "Hors service",
  PERDU: "Perdu",
};

export default function Dashboard() {
  const { data, loading, error } = useFetch("/dashboard/summary");

  if (loading) return <div className="empty-state">Chargement du tableau de bord…</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const maxStock = Math.max(1, ...data.stockParStatut.map((s) => s.count));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tableau de bord</h1>
          <p>Vue d'ensemble de l'activité — location-entretien &amp; logistique</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card accent-primary">
          <div className="kpi-label">Clients actifs</div>
          <div className="kpi-value">{data.clientsActifs}</div>
        </div>
        <div className="kpi-card accent-primary">
          <div className="kpi-label">Contrats actifs</div>
          <div className="kpi-value">{data.contratsActifs}</div>
        </div>
        <div className="kpi-card accent-danger">
          <div className="kpi-label">Factures en retard</div>
          <div className="kpi-value">{data.facturesEnRetard}</div>
        </div>
        <div className="kpi-card accent-info">
          <div className="kpi-label">Tournées aujourd'hui</div>
          <div className="kpi-value">
            {data.tourneesDuJour} <span style={{ fontSize: 14, color: "var(--color-text-muted)" }}>/ {data.arretsDuJour} arrêts</span>
          </div>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="kpi-card">
          <div className="kpi-label">Chiffre d'affaires facturé</div>
          <div className="kpi-value">{formatFcfa(data.caFacture)}</div>
        </div>
        <div className="kpi-card accent-primary">
          <div className="kpi-label">Chiffre d'affaires encaissé</div>
          <div className="kpi-value">{formatFcfa(data.caEncaisse)}</div>
        </div>
        <div className="kpi-card accent-danger">
          <div className="kpi-label">Encours client (impayé)</div>
          <div className="kpi-value">{formatFcfa(data.encoursTotal)}</div>
        </div>
      </div>

      <div className="panel">
        <h2>Répartition du parc d'articles (blanchisserie)</h2>
        {data.stockParStatut.length === 0 ? (
          <p className="text-muted">Aucun article suivi pour le moment.</p>
        ) : (
          <div className="bar-chart">
            {data.stockParStatut.map((s) => (
              <div className="bar-row" key={s.status}>
                <span>{STATUS_LABELS[s.status] || s.status}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(s.count / maxStock) * 100}%` }}
                  />
                </div>
                <span>{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
