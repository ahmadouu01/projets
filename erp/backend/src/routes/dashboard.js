const express = require("express");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const [
      clientsActifs,
      contratsActifs,
      facturesEnRetard,
      facturesImpayees,
      stockParStatut,
      tourneesDuJour,
      caEncaisseAgg,
      caFactureAgg,
    ] = await Promise.all([
      prisma.client.count({ where: { active: true } }),
      prisma.contract.count({ where: { status: "ACTIF" } }),
      prisma.invoice.count({ where: { status: "EN_RETARD" } }),
      prisma.invoice.findMany({
        where: { status: { in: ["ENVOYEE", "EN_RETARD"] } },
        select: { totalTTC: true },
      }),
      prisma.stockItem.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.round.findMany({
        where: {
          date: {
            gte: new Date(new Date().toDateString()),
            lt: new Date(new Date(Date.now() + 86400000).toDateString()),
          },
        },
        include: { stops: true },
      }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.invoice.aggregate({ _sum: { totalTTC: true } }),
    ]);

    const encoursTotal = facturesImpayees.reduce((s, f) => s + f.totalTTC, 0);

    res.json({
      clientsActifs,
      contratsActifs,
      facturesEnRetard,
      encoursTotal,
      caFacture: caFactureAgg._sum.totalTTC || 0,
      caEncaisse: caEncaisseAgg._sum.amount || 0,
      stockParStatut: stockParStatut.map((s) => ({
        status: s.status,
        count: s._count._all,
      })),
      tourneesDuJour: tourneesDuJour.length,
      arretsDuJour: tourneesDuJour.reduce((s, r) => s + r.stops.length, 0),
    });
  })
);

module.exports = router;
