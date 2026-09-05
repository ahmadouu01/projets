import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Contracts from "./pages/Contracts";
import Invoices from "./pages/Invoices";
import Stock from "./pages/Stock";
import Rounds from "./pages/Rounds";
import Employees from "./pages/Employees";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="contrats" element={<Contracts />} />
          <Route path="facturation" element={<Invoices />} />
          <Route path="stock" element={<Stock />} />
          <Route path="tournees" element={<Rounds />} />
          <Route path="rh" element={<Employees />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
