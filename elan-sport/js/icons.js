/* ELAN SPORT — Pictogrammes vêtements (SVG en ligne, dessinés à la main).
   Utilisés à la place de photos produit : aucun fichier externe requis. */

const GARMENT_ICONS = {
  tshirt: `<path d="M20 14 L26 8 H38 L44 14 L56 20 L50 30 L44 26 V54 H20 V26 L14 30 L8 20 Z"/>`,
  jacket: `<path d="M20 14 L26 8 H38 L44 14 L56 22 L49 32 L44 27 V54 H20 V27 L15 32 L8 22 Z"/><path d="M32 8 V54" stroke-dasharray="3 3"/>`,
  legging: `<path d="M22 8 H42 V26 L38 56 H31 L32 30 L28 56 H21 L22 26 Z"/>`,
  short: `<path d="M20 8 H44 V26 L40 40 H32 L31 26 L30 40 H22 L20 26 Z"/>`,
  bra: `<path d="M14 22 C14 12 24 10 32 18 C40 10 50 12 50 22 C50 30 40 34 32 28 C24 34 14 30 14 22 Z"/>`,
  hoodie: `<path d="M20 18 C20 10 44 10 44 18 L56 24 L50 34 L44 29 V54 H20 V29 L14 34 L8 24 Z"/><path d="M22 16 C22 24 42 24 42 16" />`,
  zip: `<path d="M20 14 L26 8 H38 L44 14 L56 20 L50 30 L44 26 V54 H20 V26 L14 30 L8 20 Z"/><path d="M32 10 V54" stroke-dasharray="2 3"/>`,
  tank: `<path d="M24 10 L26 18 H38 L40 10 L46 12 L42 24 H38 V54 H26 V24 H22 Z"/>`,
  shoe: `<path d="M8 44 H50 C56 44 58 38 54 34 L46 30 C42 24 34 20 26 22 L22 30 L10 34 C6 36 6 42 8 44 Z"/><path d="M22 30 L30 34 M28 24 L34 30" />`,
  cap: `<path d="M10 34 C10 20 54 20 54 34 H10 Z"/><path d="M10 34 C2 34 2 40 10 40 H16 V34"/><path d="M32 20 V12" stroke-dasharray="2 2"/>`,
  vest: `<path d="M22 12 L28 8 H36 L42 12 L38 20 H26 Z"/><path d="M22 12 L18 30 V54 H46 V30 L42 12" /><path d="M32 20 V54" stroke-dasharray="3 3"/>`,
};

function garmentSVG(type) {
  const inner = GARMENT_ICONS[type] || GARMENT_ICONS.tshirt;
  return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}
