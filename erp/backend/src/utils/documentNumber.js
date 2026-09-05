// Génère des références lisibles : FAC-2026-000123, CTR-2026-000045...
function buildDocumentNumber(prefix, sequence) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(sequence).padStart(6, "0")}`;
}

module.exports = { buildDocumentNumber };
