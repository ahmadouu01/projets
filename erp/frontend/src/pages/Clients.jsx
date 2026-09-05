import { useState } from "react";
import { useFetch } from "../hooks/useApi";
import { api } from "../api/client";
import Modal from "../components/Modal";
import Badge from "../components/Badge";
import { formatFcfa, formatDate } from "../utils/format";

const REGIONS = ["Dakar", "Thiès", "Saint-Louis", "Diourbel", "Kaolack", "Ziguinchor", "Louga"];

const EMPTY_FORM = {
  name: "",
  sector: "",
  ninea: "",
  rccm: "",
  phone: "",
  email: "",
  address: "",
  city: "Dakar",
  region: "Dakar",
  contactName: "",
};

export default function Clients() {
  const { data: clients, loading, error, reload } = useFetch("/clients");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/clients", form);
      setShowForm(false);
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clients &amp; Sites</h1>
          <p>Portefeuille client et sites de livraison</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Nouveau client
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        {loading ? (
          <p className="text-muted">Chargement…</p>
        ) : clients.length === 0 ? (
          <div className="empty-state">Aucun client enregistré.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Secteur</th>
                  <th>Ville / Région</th>
                  <th>Contact</th>
                  <th>Contrats</th>
                  <th>Factures</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div className="text-muted">{c.ninea}</div>
                    </td>
                    <td>{c.sector || "—"}</td>
                    <td>{c.city}, {c.region}</td>
                    <td>
                      {c.contactName || "—"}
                      <div className="text-muted">{c.phone}</div>
                    </td>
                    <td>{c._count?.contracts ?? 0}</td>
                    <td>{c._count?.invoices ?? 0}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => setSelectedId(c.id)}>
                        Détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title="Nouveau client" onClose={() => setShowForm(false)}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="field">
                <label>Raison sociale *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Secteur d'activité</label>
                <input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
              </div>
              <div className="field">
                <label>NINEA</label>
                <input value={form.ninea} onChange={(e) => setForm({ ...form, ninea: e.target.value })} />
              </div>
              <div className="field">
                <label>RCCM</label>
                <input value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} />
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+221 77 000 00 00" />
              </div>
              <div className="field">
                <label>E-mail</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Ville</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="field">
                <label>Région</label>
                <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Contact principal</label>
                <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div className="field">
                <label>Adresse</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? "Enregistrement…" : "Créer le client"}</button>
            </div>
          </form>
        </Modal>
      )}

      {selectedId && <ClientDetailModal id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function ClientDetailModal({ id, onClose }) {
  const { data: client, loading, error } = useFetch(`/clients/${id}`);

  return (
    <Modal title={client ? client.name : "Client"} onClose={onClose} wide>
      {loading && <p className="text-muted">Chargement…</p>}
      {error && <div className="alert alert-error">{error}</div>}
      {client && (
        <div>
          <div className="form-grid" style={{ marginBottom: 18 }}>
            <div><strong>NINEA</strong><div className="text-muted">{client.ninea || "—"}</div></div>
            <div><strong>RCCM</strong><div className="text-muted">{client.rccm || "—"}</div></div>
            <div><strong>Téléphone</strong><div className="text-muted">{client.phone || "—"}</div></div>
            <div><strong>E-mail</strong><div className="text-muted">{client.email || "—"}</div></div>
          </div>

          <h3>Sites de livraison ({client.sites.length})</h3>
          <ul>
            {client.sites.map((s) => (
              <li key={s.id}>{s.name} — {s.address}, {s.city}</li>
            ))}
          </ul>

          <h3>Contrats ({client.contracts.length})</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Référence</th><th>Statut</th><th>Articles</th></tr></thead>
              <tbody>
                {client.contracts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.reference}</td>
                    <td><Badge value={c.status} /></td>
                    <td>{c.lines.length} type(s)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Dernières factures</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>N°</th><th>Date</th><th>Montant TTC</th><th>Statut</th></tr></thead>
              <tbody>
                {client.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.number}</td>
                    <td>{formatDate(inv.issueDate)}</td>
                    <td>{formatFcfa(inv.totalTTC)}</td>
                    <td><Badge value={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
