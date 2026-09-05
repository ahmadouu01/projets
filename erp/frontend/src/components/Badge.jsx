const COLORS = {
  // Contrats
  ACTIF: "green",
  SUSPENDU: "yellow",
  RESILIE: "gray",
  // Factures
  BROUILLON: "gray",
  ENVOYEE: "blue",
  PAYEE: "green",
  EN_RETARD: "red",
  ANNULEE: "gray",
  // Stock
  EN_STOCK: "blue",
  EN_SERVICE: "green",
  EN_LAVAGE: "yellow",
  HORS_SERVICE: "gray",
  PERDU: "red",
  // Tournées
  PLANIFIEE: "blue",
  EN_COURS: "yellow",
  TERMINEE: "green",
  A_FAIRE: "gray",
  LIVRE: "green",
  ECHEC: "red",
  // Véhicules
  DISPONIBLE: "green",
  EN_TOURNEE: "blue",
  MAINTENANCE: "yellow",
};

export default function Badge({ value, label }) {
  const color = COLORS[value] || "gray";
  return <span className={`badge badge-${color}`}>{label || value}</span>;
}
