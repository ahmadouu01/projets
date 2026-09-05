// Calcul de paie simplifié, basé sur les grands principes de la législation
// sénégalaise (barème IRPP, cotisations IPRES/CNSS). Ces taux sont des
// approximations à des fins de démonstration : ils doivent être validés par
// un expert-comptable / la DGI / l'IPRES avant tout usage réel en paie.

const IRPP_BRACKETS = [
  { upTo: 630000, rate: 0 },
  { upTo: 1500000, rate: 0.2 },
  { upTo: 4000000, rate: 0.3 },
  { upTo: 8000000, rate: 0.35 },
  { upTo: 13500000, rate: 0.37 },
  { upTo: Infinity, rate: 0.4 },
];

const IPRES_RATE = 0.056; // part salariale régime général (retraite)
const IPRES_CEILING = 360000; // plafond mensuel approximatif en FCFA
const CNSS_RATE = 0.056; // part salariale approximative (prestations familiales/vieillesse)
const CNSS_CEILING = 360000;

function calcAnnualIrpp(annualTaxableIncome) {
  let remaining = annualTaxableIncome;
  let previousCap = 0;
  let tax = 0;

  for (const bracket of IRPP_BRACKETS) {
    if (remaining <= 0) break;
    const bracketSize = bracket.upTo - previousCap;
    const taxedInBracket = Math.min(remaining, bracketSize);
    tax += taxedInBracket * bracket.rate;
    remaining -= taxedInBracket;
    previousCap = bracket.upTo;
  }

  return tax;
}

function computePayroll({ baseSalary, allowances = 0 }) {
  const grossMonthly = baseSalary + allowances;

  const ipresBase = Math.min(baseSalary, IPRES_CEILING);
  const cnssBase = Math.min(baseSalary, CNSS_CEILING);

  const ipresDeduction = Math.round(ipresBase * IPRES_RATE);
  const cnssDeduction = Math.round(cnssBase * CNSS_RATE);

  const taxableMonthly = Math.max(
    0,
    grossMonthly - ipresDeduction - cnssDeduction
  );
  const annualIrpp = calcAnnualIrpp(taxableMonthly * 12);
  const irppDeduction = Math.round(annualIrpp / 12);

  const netSalary =
    grossMonthly - ipresDeduction - cnssDeduction - irppDeduction;

  return {
    baseSalary,
    allowances,
    ipresDeduction,
    cnssDeduction,
    irppDeduction,
    netSalary: Math.round(netSalary),
  };
}

module.exports = { computePayroll };
