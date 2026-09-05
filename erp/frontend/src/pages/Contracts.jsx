import { useState } from "react";
import { useFetch } from "../hooks/useApi";
import { api } from "../api/client";
import Modal from "../components/Modal";
import Badge from "../components/Badge";
import { formatDate } from "../utils/format";

const EMPTY_LINE = { articleTypeId: "", quantity: 1, unitPrice: 0 };

export default function Contracts() {
  const { data: contracts, loading, error, reload } = useFetch("/contracts");
  const { data: clients } = useFetch("/clients");
  const { data: articleTypes } = useFetch("/article-types");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [clientId, setClientId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [billingFrequency, setBillingFrequency] = useState("MENSUEL");
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [actionMessage, setActionMessage] = useState(null);

  const selectedClient = clients?.find((c) => String(c.id) === String(clientId));

  function updateLine(idx, patch) {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((ls) => [...ls, { ...EMPTY_LINE }]);
  }

  function removeLine(idx) {
    setLines((ls) => ls.filter((_, i) => i !== idx));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const siteId = selectedClient?.sites?.[0]?.id;
      await api.post("/contracts", {
        clientId: Number(clientId),
        siteId: siteId ?? undefined,
        startDate,
        billingFrequency,
        lines: lines
          .filter((l) => l.articleTypeId)
          .map((l) => ({
            articleTypeId: Number(l.articleTypeId),
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
          })),
      });
      setShowForm(false);
      setLines([{ ...EMPTY_LINE }]);
      setClientId("");
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateInvoice(contractId) {
    setActionMessage(null);
    try {
      const invoice = await api.post(`/contracts/${contractId}/generate-invoice`, {});
      setActionMessage(`Facture ${invoice.number} générée avec succès.`);
    } catch (err) {
      setActionMessage(`Erreur : ${err.message}`);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Contrats de location-entretien</h1>
          <p>Contrats clients et articles loués par site</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Nouveau contrat
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {actionMessage && <div className="alert alert-info">{actionMessage}</div>}

      <div className="panel">
        {loading ? (
          <p className="text-muted">Chargement…</p>
        ) : contracts.length === 0 ? (
          <div className="empty-state">Aucun contrat pour le moment.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Début</th>
                  <th>Fréquence</th>
                  <th>Statut</th>
                  <th>Articles</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.reference}</td>
                    <td>{c.client.name}</td>
                    <td>{formatDate(c.startDate)}</td>
                    <td>{c.billingFrequency}</td>
                    <td><Badge value={c.status} /></td>
                    <td>
                      <div className="tag-list">
                        {c.lines.map((l) => (
                          <span className="badge badge-gray" key={l.id}>
                            {l.articleType.name} × {l.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => handleGenerateInvoice(c.id)}>
                        Générer facture
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
        <Modal title="Nouveau contrat" onClose={() => setShowForm(false)} wide>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="field">
                <label>Client *</label>
                <select required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">— Choisir —</option>
                  {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Date de début</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="field">
                <label>Fréquence de facturation</label>
                <select value={billingFrequency} onChange={(e) => setBillingFrequency(e.target.value)}>
                  <option value="MENSUEL">Mensuelle</option>
                  <option value="TRIMESTRIEL">Trimestrielle</option>
                  <option value="ANNUEL">Annuelle</option>
                </select>
              </div>
            </div>

            <h3>Articles loués</h3>
            <div className="line-items">
              {lines.map((line, idx) => (
                <div className="line-item-row" key={idx}>
                  <select
                    value={line.articleTypeId}
                    onChange={(e) => {
                      const at = articleTypes?.find((a) => String(a.id) === e.target.value);
                      updateLine(idx, {
                        articleTypeId: e.target.value,
                        unitPrice: at ? at.rentalPrice : line.unitPrice,
                      });
                    }}
                  >
                    <option value="">— Article —</option>
                    {articleTypes?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <input
                    type="number"
                    min="1"
                    placeholder="Qté"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Prix unitaire (FCFA)"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                  />
                  <button type="button" className="icon-btn" onClick={() => removeLine(idx)}>✕</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-secondary" onClick={addLine}>+ Ajouter un article</button>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? "Enregistrement…" : "Créer le contrat"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
