import { useState } from "react";
import { useFetch } from "../hooks/useApi";
import { api } from "../api/client";
import Modal from "../components/Modal";
import Badge from "../components/Badge";
import { formatFcfa, formatDate } from "../utils/format";

export default function Invoices() {
  const { data: invoices, loading, error, reload } = useFetch("/invoices");
  const [payInvoice, setPayInvoice] = useState(null);
  const [message, setMessage] = useState(null);

  async function markStatus(id, status) {
    setMessage(null);
    try {
      await api.put(`/invoices/${id}/status`, { status });
      reload();
    } catch (err) {
      setMessage(`Erreur : ${err.message}`);
    }
  }

  const totalTTC = invoices?.reduce((s, i) => s + i.totalTTC, 0) || 0;
  const totalPaid = invoices?.reduce(
    (s, i) => s + i.payments.reduce((sp, p) => sp + p.amount, 0),
    0
  ) || 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Facturation &amp; Finance</h1>
          <p>Factures, encaissements et TVA (18%)</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total facturé</div>
          <div className="kpi-value">{formatFcfa(totalTTC)}</div>
        </div>
        <div className="kpi-card accent-primary">
          <div className="kpi-label">Total encaissé</div>
          <div className="kpi-value">{formatFcfa(totalPaid)}</div>
        </div>
        <div className="kpi-card accent-danger">
          <div className="kpi-label">Solde dû</div>
          <div className="kpi-value">{formatFcfa(totalTTC - totalPaid)}</div>
        </div>
      </div>

      <div className="panel">
        {loading ? (
          <p className="text-muted">Chargement…</p>
        ) : invoices.length === 0 ? (
          <div className="empty-state">Aucune facture pour le moment.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° Facture</th>
                  <th>Client</th>
                  <th>Émission</th>
                  <th>Échéance</th>
                  <th>Total TTC</th>
                  <th>Payé</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
                  return (
                    <tr key={inv.id}>
                      <td>{inv.number}</td>
                      <td>{inv.client.name}</td>
                      <td>{formatDate(inv.issueDate)}</td>
                      <td>{formatDate(inv.dueDate)}</td>
                      <td>{formatFcfa(inv.totalTTC)}</td>
                      <td>{formatFcfa(paid)}</td>
                      <td><Badge value={inv.status} /></td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {inv.status === "BROUILLON" && (
                            <button className="btn btn-secondary" onClick={() => markStatus(inv.id, "ENVOYEE")}>
                              Envoyer
                            </button>
                          )}
                          {inv.status !== "PAYEE" && inv.status !== "ANNULEE" && (
                            <button className="btn btn-primary" onClick={() => setPayInvoice(inv)}>
                              Encaisser
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {payInvoice && (
        <PaymentModal
          invoice={payInvoice}
          onClose={() => setPayInvoice(null)}
          onSaved={() => {
            setPayInvoice(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function PaymentModal({ invoice, onClose, onSaved }) {
  const paid = invoice.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = invoice.totalTTC - paid;
  const [amount, setAmount] = useState(remaining);
  const [method, setMethod] = useState("MOBILE_MONEY");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/invoices/${invoice.id}/payments`, {
        amount: Number(amount),
        method,
        reference: reference || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Encaissement — ${invoice.number}`} onClose={onClose}>
      <p className="text-muted">Solde restant dû : <strong>{formatFcfa(remaining)}</strong></p>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label>Montant (FCFA)</label>
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="field">
            <label>Moyen de paiement</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="MOBILE_MONEY">Mobile Money (Orange Money / Wave)</option>
              <option value="VIREMENT">Virement bancaire</option>
              <option value="ESPECES">Espèces</option>
              <option value="CHEQUE">Chèque</option>
            </select>
          </div>
          <div className="field">
            <label>Référence</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° transaction" />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer le paiement"}</button>
        </div>
      </form>
    </Modal>
  );
}
