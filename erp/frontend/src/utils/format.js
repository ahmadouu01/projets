export function formatFcfa(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("fr-SN", {
    maximumFractionDigits: 0,
  }).format(value) + " FCFA";
}

export function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
