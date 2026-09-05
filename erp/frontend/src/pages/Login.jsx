import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@erp-senegal.sn");
  const [password, setPassword] = useState("Senegal2026!");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>ERP Teranga</h1>
        <p className="subtitle">
          Location-entretien de linge, tenues professionnelles &amp; hygiène —
          Sénégal
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="email">Adresse e-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <div className="login-demo">
          Comptes de démonstration (mot de passe <code>Senegal2026!</code>) :
          <br />
          <code>admin@erp-senegal.sn</code>, <code>commercial@erp-senegal.sn</code>,{" "}
          <code>logistique@erp-senegal.sn</code>, <code>production@erp-senegal.sn</code>,{" "}
          <code>compta@erp-senegal.sn</code>, <code>rh@erp-senegal.sn</code>
        </div>
      </div>
    </div>
  );
}
