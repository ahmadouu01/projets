import { useState } from "react";
import { useFetch } from "../hooks/useApi";
import { api } from "../api/client";
import Modal from "../components/Modal";
import Badge from "../components/Badge";
import { formatFcfa, formatDate } from "../utils/format";

const CATEGORY_LABELS = {
  VETEMENT_TRAVAIL: "Vêtement de travail",
  LINGE_PLAT: "Linge plat",
  TAPIS: "Tapis / paillasson",
  HYGIENE: "Hygiène sanitaire",
};

const EMPTY_ARTICLE = { name: "", category: "VETEMENT_TRAVAIL", replacementCost: 0, rentalPrice: 0 };
const EMPTY_ITEM = { code: "", articleTypeId: "", clientId: "" };

export default function Stock() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data: articleTypes, reload: reloadTypes } = useFetch("/article-types");
  const { data: clients } = useFetch("/clients");
  const {
    data: stockItems,
    loading,
    error,
    reload: reloadItems,
  } = useFetch(`/stock-items${statusFilter ? `?status=${statusFilter}` : ""}`, { deps: [statusFilter] });

  const [showArticleForm, setShowArticleForm] = useState(false);
  const [articleForm, setArticleForm] = useState(EMPTY_ARTICLE);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  async function handleCreateArticle(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/article-types", {
        ...articleForm,
        replacementCost: Number(articleForm.replacementCost),
        rentalPrice: Number(articleForm.rentalPrice),
      });
      setShowArticleForm(false);
      setArticleForm(EMPTY_ARTICLE);
      reloadTypes();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateItem(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/stock-items", {
        code: itemForm.code,
        articleTypeId: Number(itemForm.articleTypeId),
        clientId: itemForm.clientId ? Number(itemForm.clientId) : undefined,
      });
      setShowItemForm(false);
      setItemForm(EMPTY_ITEM);
      reloadItems();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function startWash(id) {
    await api.post(`/stock-items/${id}/wash/start`, {});
    reloadItems();
  }

  async function finishWash(id, result) {
    await api.post(`/stock-items/${id}/wash/finish`, { result });
    reloadItems();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Stock &amp; Production (blanchisserie)</h1>
          <p>Catalogue d'articles et traçabilité du parc en circulation</p>
        </div>
      </div>

      <div className="panel">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Catalogue d'articles</h2>
          <button className="btn btn-secondary" onClick={() => setShowArticleForm(true)}>
            + Nouveau type d'article
          </button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Catégorie</th>
                <th>Prix location-entretien</th>
                <th>Coût de remplacement</th>
                <th>En circulation</th>
              </tr>
            </thead>
            <tbody>
              {articleTypes?.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{CATEGORY_LABELS[a.category]}</td>
                  <td>{formatFcfa(a.rentalPrice)}</td>
                  <td>{formatFcfa(a.replacementCost)}</td>
                  <td>{a._count?.stockItems ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Parc traçable</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="EN_STOCK">En stock</option>
              <option value="EN_SERVICE">En service</option>
              <option value="EN_LAVAGE">En lavage</option>
              <option value="HORS_SERVICE">Hors service</option>
              <option value="PERDU">Perdu</option>
            </select>
            <button className="btn btn-secondary" onClick={() => setShowItemForm(true)}>
              + Enregistrer un article
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <p className="text-muted">Chargement…</p>
        ) : stockItems.length === 0 ? (
          <div className="empty-state">Aucun article pour ce filtre.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Article</th>
                  <th>Client affecté</th>
                  <th>Statut</th>
                  <th>Lavages</th>
                  <th>Dernier lavage</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stockItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{item.articleType.name}</td>
                    <td>{item.client?.name || "—"}</td>
                    <td><Badge value={item.status} /></td>
                    <td>{item.washCount}</td>
                    <td>{formatDate(item.lastWashDate)}</td>
                    <td>
                      {item.status !== "EN_LAVAGE" && item.status !== "HORS_SERVICE" && item.status !== "PERDU" && (
                        <button className="btn btn-secondary" onClick={() => startWash(item.id)}>
                          Envoyer au lavage
                        </button>
                      )}
                      {item.status === "EN_LAVAGE" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-primary" onClick={() => finishWash(item.id, "OK")}>OK</button>
                          <button className="btn btn-danger" onClick={() => finishWash(item.id, "REBUT")}>Rebut</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showArticleForm && (
        <Modal title="Nouveau type d'article" onClose={() => setShowArticleForm(false)}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleCreateArticle}>
            <div className="form-grid">
              <div className="field">
                <label>Nom *</label>
                <input required value={articleForm.name} onChange={(e) => setArticleForm({ ...articleForm, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Catégorie</label>
                <select value={articleForm.category} onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Prix location-entretien (FCFA)</label>
                <input type="number" min="0" value={articleForm.rentalPrice} onChange={(e) => setArticleForm({ ...articleForm, rentalPrice: e.target.value })} />
              </div>
              <div className="field">
                <label>Coût de remplacement (FCFA)</label>
                <input type="number" min="0" value={articleForm.replacementCost} onChange={(e) => setArticleForm({ ...articleForm, replacementCost: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowArticleForm(false)}>Annuler</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? "Enregistrement…" : "Créer"}</button>
            </div>
          </form>
        </Modal>
      )}

      {showItemForm && (
        <Modal title="Enregistrer un article traçable" onClose={() => setShowItemForm(false)}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <form onSubmit={handleCreateItem}>
            <div className="form-grid">
              <div className="field">
                <label>Code (code-barres / puce) *</label>
                <input required value={itemForm.code} onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })} />
              </div>
              <div className="field">
                <label>Type d'article *</label>
                <select required value={itemForm.articleTypeId} onChange={(e) => setItemForm({ ...itemForm, articleTypeId: e.target.value })}>
                  <option value="">— Choisir —</option>
                  {articleTypes?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Client affecté</label>
                <select value={itemForm.clientId} onChange={(e) => setItemForm({ ...itemForm, clientId: e.target.value })}>
                  <option value="">— Aucun (stock) —</option>
                  {clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowItemForm(false)}>Annuler</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? "Enregistrement…" : "Créer"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
