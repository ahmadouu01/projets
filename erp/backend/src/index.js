require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { ZodError } = require("zod");

const { requireAuth } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const clientRoutes = require("./routes/clients");
const siteRoutes = require("./routes/sites");
const contractRoutes = require("./routes/contracts");
const articleTypeRoutes = require("./routes/articleTypes");
const stockItemRoutes = require("./routes/stockItems");
const washCycleRoutes = require("./routes/washCycles");
const invoiceRoutes = require("./routes/invoices");
const vehicleRoutes = require("./routes/vehicles");
const driverRoutes = require("./routes/drivers");
const roundRoutes = require("./routes/rounds");
const employeeRoutes = require("./routes/employees");
const payrollRoutes = require("./routes/payroll");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Authentification publique
app.use("/api/auth", authRoutes);

// Tout le reste de l'API nécessite d'être authentifié
app.use("/api/clients", requireAuth, clientRoutes);
app.use("/api/sites", requireAuth, siteRoutes);
app.use("/api/contracts", requireAuth, contractRoutes);
app.use("/api/article-types", requireAuth, articleTypeRoutes);
app.use("/api/stock-items", requireAuth, stockItemRoutes);
app.use("/api/wash-cycles", requireAuth, washCycleRoutes);
app.use("/api/invoices", requireAuth, invoiceRoutes);
app.use("/api/vehicles", requireAuth, vehicleRoutes);
app.use("/api/drivers", requireAuth, driverRoutes);
app.use("/api/rounds", requireAuth, roundRoutes);
app.use("/api/employees", requireAuth, employeeRoutes);
app.use("/api/payroll", requireAuth, payrollRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);

// Gestion centralisée des erreurs
app.use((err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Données invalides.",
      errors: err.errors,
    });
  }
  if (err.code === "P2002") {
    return res.status(409).json({ message: "Cette valeur existe déjà (contrainte unique)." });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ message: "Ressource introuvable." });
  }
  console.error(err);
  res.status(500).json({ message: "Erreur interne du serveur." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API ERP Sénégal démarrée sur http://localhost:${PORT}`);
});
