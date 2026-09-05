import { useState } from "react";
import { useFetch } from "../hooks/useApi";
import { api } from "../api/client";
import Modal from "../components/Modal";
import { formatFcfa, formatDate } from "../utils/format";

const DEPARTMENT_LABELS = {
  DIRECTION: "Direction",
  COMMERCIAL: "Commercial",
  PRODUCTION: "Production",
  LOGISTIQUE: "Logistique",
  ADMINISTRATION: "Administration",
  RH: "Ressources Humaines",
};

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  position: "",
  department: "PRODUCTION",
  hireDate: new Date().toISOString().slice(0, 10),
  phone: "",
  email: "",
  baseSalary: 150000,
};

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Employees() {
  const { data: employees, loading, error, reload } = useFetch("/employees");
  const [period, setPeriod] = useState(currentPeriod());
  const { data: payrolls, reload: reloadPayrolls } = useFetch(`/payroll?period=${period}`, { deps: [period] });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [message, setMessage] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/employees", { ...form, baseSalary: Number(form.baseSalary) });
      setShowForm(false);
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleGeneratePayroll() {
    setMessage(null);
    try {
      const result = await api.post("/payroll/generate", { period });
      setMessage(`${result.length} bulletin(s) de paie généré(s) pour ${period}.`);
      reloadPayrolls();
    } catch (err) {
      setMessage(`Erreur : ${err.message}`);
    }
  }

  const totalNet = payrolls?.reduce((s, p) => s + p.netSalary, 0) || 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>RH &amp; Paie</h1>
          <p>Effectifs et paie mensuelle (estimation IRPP / IPRES / CNSS)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nouvel employé</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        <h2>Effectifs ({employees?.length ?? 0})</h2>
        {loading ? (
          <p className="text-muted">Chargement…</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Nom</th><th>Poste</th><th>Département</th><th>Embauche</th><th>Salaire de base</th></tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id}>
                    <td>{e.firstName} {e.lastName}</td>
                    <td>{e.position}</td>
                    <td>{DEPARTMENT_LABELS[e.department]}</td>
                    <td>{formatDate(e.hireDate)}</td>
                    <td>{formatFcfa(e.baseSalary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Bulletins de paie</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            <button className="btn btn-primary" onClick={handleGeneratePayroll}>Générer la paie du mois</button>
          </div>
        </div>
        {message && <div className="alert alert-info">{message}</div>}
        <p className="text-muted">
          ⚠️ Calcul simplifié à but de démonstration (barème IRPP, taux IPRES/CNSS
          approximatifs) — à valider avec un expert-comptable avant tout usage réel.
        </p>
        {payrolls && payrolls.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employé</th><th>Salaire de base</th><th>Primes</th>
                  <th>IPRES</th><th>CNSS</th><th>IRPP</th><th>Net à payer</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((p) => (
                  <tr key={p.id}>
                    <td>{p.employee.firstName} {p.employee.lastName}</td>
                    <td>{formatFcfa(p.baseSalary)}</td>
                    <td>{formatFcfa(p.allowances)}</td>
                    <td>{formatFcfa(p.ipresDeduction)}</td>
                    <td>{formatFcfa(p.cnssDeduction)}</td>
                    <td>{formatFcfa(p.irppDeduction)}</td>
                    <td><strong>{formatFcfa(p.netSalary)}</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6}><strong>Masse salariale nette totale</strong></td>
                  <td><strong>{formatFcfa(totalNet)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="empty-state">Aucun bulletin généré pour {period}.</div>
        )}
      </div>

      {showForm && (
        <Modal title="Nouvel employé" onClose={() => setShowForm(false)}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="field">
                <label>Prénom *</label>
                <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="field">
                <label>Nom *</label>
                <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div className="field">
                <label>Poste *</label>
                <input required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </div>
              <div className="field">
                <label>Département</label>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  {Object.entries(DEPARTMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Date d'embauche</label>
                <input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
              </div>
              <div className="field">
                <label>Salaire de base (FCFA)</label>
                <input type="number" min="0" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+221 77 000 00 00" />
              </div>
              <div className="field">
                <label>E-mail</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? "Enregistrement…" : "Créer"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
