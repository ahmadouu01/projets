import { useState } from "react";
import { useFetch } from "../hooks/useApi";
import { api } from "../api/client";
import Modal from "../components/Modal";
import Badge from "../components/Badge";
import { formatDate } from "../utils/format";

const EMPTY_STOP = { clientId: "", siteId: "" };

export default function Rounds() {
  const { data: rounds, loading, error, reload } = useFetch("/rounds");
  const { data: vehicles, reload: reloadVehicles } = useFetch("/vehicles");
  const { data: drivers, reload: reloadDrivers } = useFetch("/drivers");
  const { data: clients } = useFetch("/clients");

  const [showRoundForm, setShowRoundForm] = useState(false);
  const [showFleetForm, setShowFleetForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [zone, setZone] = useState("Dakar");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [stops, setStops] = useState([{ ...EMPTY_STOP }]);

  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState(800);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");

  function updateStop(idx, patch) {
    setStops((ss) => ss.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  async function handleCreateRound(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/rounds", {
        name,
        date,
        zone,
        vehicleId: vehicleId ? Number(vehicleId) : undefined,
        driverId: driverId ? Number(driverId) : undefined,
        stops: stops
          .filter((s) => s.clientId)
          .map((s, idx) => ({ clientId: Number(s.clientId), sequence: idx + 1 })),
      });
      setShowRoundForm(false);
      setName("");
      setStops([{ ...EMPTY_STOP }]);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddVehicleDriver(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (vehiclePlate) {
        await api.post("/vehicles", { plate: vehiclePlate, model: vehicleModel, capacity: Number(vehicleCapacity) });
      }
      if (driverName) {
        await api.post("/drivers", { name: driverName, phone: driverPhone || undefined });
      }
      setShowFleetForm(false);
      setVehiclePlate("");
      setVehicleModel("");
      setDriverName("");
      setDriverPhone("");
      reloadVehicles();
      reloadDrivers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateStopStatus(roundId, stopId, status) {
    await api.put(`/rounds/${roundId}/stops/${stopId}`, { status });
    reload();
  }

  async function updateRoundStatus(id, status) {
    await api.put(`/rounds/${id}`, { status });
    reload();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tournées &amp; Logistique</h1>
          <p>Planification des livraisons/collectes de linge par zone</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowFleetForm(true)}>+ Véhicule / Chauffeur</button>
          <button className="btn btn-primary" onClick={() => setShowRoundForm(true)}>+ Nouvelle tournée</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Véhicules</div>
          <div className="kpi-value">{vehicles?.length ?? "…"}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Chauffeurs</div>
          <div className="kpi-value">{drivers?.length ?? "…"}</div>
        </div>
        <div className="kpi-card accent-info">
          <div className="kpi-label">Tournées planifiées</div>
          <div className="kpi-value">{rounds?.filter((r) => r.status === "PLANIFIEE").length ?? "…"}</div>
        </div>
      </div>

      <div className="panel">
        {loading ? (
          <p className="text-muted">Chargement…</p>
        ) : rounds.length === 0 ? (
          <div className="empty-state">Aucune tournée planifiée.</div>
        ) : (
          rounds.map((round) => (
            <div key={round.id} style={{ marginBottom: 22, paddingBottom: 18, borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <strong>{round.name}</strong>{" "}
                  <span className="text-muted">— {formatDate(round.date)} · {round.zone}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge value={round.status} />
                  {round.status === "PLANIFIEE" && (
                    <button className="btn btn-secondary" onClick={() => updateRoundStatus(round.id, "EN_COURS")}>Démarrer</button>
                  )}
                  {round.status === "EN_COURS" && (
                    <button className="btn btn-primary" onClick={() => updateRoundStatus(round.id, "TERMINEE")}>Clôturer</button>
                  )}
                </div>
              </div>
              <p className="text-muted" style={{ marginTop: 0 }}>
                {round.vehicle ? `${round.vehicle.plate} (${round.vehicle.model})` : "Véhicule non assigné"} ·{" "}
                {round.driver ? round.driver.name : "Chauffeur non assigné"}
              </p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>#</th><th>Client</th><th>Site</th><th>Statut</th><th></th></tr></thead>
                  <tbody>
                    {round.stops.map((stop) => (
                      <tr key={stop.id}>
                        <td>{stop.sequence}</td>
                        <td>{stop.client.name}</td>
                        <td>{stop.site?.name || "—"}</td>
                        <td><Badge value={stop.status} /></td>
                        <td>
                          {stop.status === "A_FAIRE" && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn btn-primary" onClick={() => updateStopStatus(round.id, stop.id, "LIVRE")}>Livré</button>
                              <button className="btn btn-danger" onClick={() => updateStopStatus(round.id, stop.id, "ECHEC")}>Échec</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {showRoundForm && (
        <Modal title="Nouvelle tournée" onClose={() => setShowRoundForm(false)} wide>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleCreateRound}>
            <div className="form-grid">
              <div className="field">
                <label>Nom de la tournée *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Tournée Dakar Sud" />
              </div>
              <div className="field">
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="field">
                <label>Zone</label>
                <input value={zone} onChange={(e) => setZone(e.target.value)} />
              </div>
              <div className="field">
                <label>Véhicule</label>
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                  <option value="">— Aucun —</option>
                  {vehicles?.map((v) => <option key={v.id} value={v.id}>{v.plate} — {v.model}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Chauffeur</label>
                <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                  <option value="">— Aucun —</option>
                  {drivers?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <h3>Arrêts</h3>
            <div className="line-items">
              {stops.map((stop, idx) => (
                <div className="line-item-row" style={{ gridTemplateColumns: "1fr auto" }} key={idx}>
                  <select value={stop.clientId} onChange={(e) => updateStop(idx, { clientId: e.target.value })}>
                    <option value="">— Client —</option>
                    {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" className="icon-btn" onClick={() => setStops((ss) => ss.filter((_, i) => i !== idx))}>✕</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => setStops((ss) => [...ss, { ...EMPTY_STOP }])}>
              + Ajouter un arrêt
            </button>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowRoundForm(false)}>Annuler</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? "Enregistrement…" : "Créer la tournée"}</button>
            </div>
          </form>
        </Modal>
      )}

      {showFleetForm && (
        <Modal title="Ajouter véhicule / chauffeur" onClose={() => setShowFleetForm(false)}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleAddVehicleDriver}>
            <h3 className="mt-0">Véhicule</h3>
            <div className="form-grid">
              <div className="field">
                <label>Immatriculation</label>
                <input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} placeholder="DK-1234-AA" />
              </div>
              <div className="field">
                <label>Modèle</label>
                <input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
              </div>
              <div className="field">
                <label>Capacité (kg)</label>
                <input type="number" value={vehicleCapacity} onChange={(e) => setVehicleCapacity(e.target.value)} />
              </div>
            </div>
            <h3>Chauffeur</h3>
            <div className="form-grid">
              <div className="field">
                <label>Nom</label>
                <input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="+221 77 000 00 00" />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowFleetForm(false)}>Annuler</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
