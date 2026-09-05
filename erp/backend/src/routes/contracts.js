const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { buildDocumentNumber } = require("../utils/documentNumber");

const router = express.Router();

const lineSchema = z.object({
  articleTypeId: z.number().int(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

const contractSchema = z.object({
  clientId: z.number().int(),
  siteId: z.number().int().optional().nullable(),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  billingFrequency: z.enum(["MENSUEL", "TRIMESTRIEL", "ANNUEL"]).optional(),
  status: z.enum(["ACTIF", "SUSPENDU", "RESILIE"]).optional(),
  notes: z.string().optional().nullable(),
  lines: z.array(lineSchema).default([]),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const contracts = await prisma.contract.findMany({
      include: {
        client: true,
        site: true,
        lines: { include: { articleType: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(contracts);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const contract = await prisma.contract.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        client: true,
        site: true,
        lines: { include: { articleType: true } },
        invoices: true,
      },
    });
    if (!contract) return res.status(404).json({ message: "Contrat introuvable." });
    res.json(contract);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = contractSchema.parse(req.body);
    const count = await prisma.contract.count();
    const reference = buildDocumentNumber("CTR", count + 1);

    const contract = await prisma.contract.create({
      data: {
        reference,
        clientId: data.clientId,
        siteId: data.siteId ?? undefined,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        billingFrequency: data.billingFrequency,
        status: data.status,
        notes: data.notes,
        lines: {
          create: data.lines.map((line) => ({
            articleTypeId: line.articleTypeId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        },
      },
      include: { lines: { include: { articleType: true } }, client: true, site: true },
    });

    res.status(201).json(contract);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = contractSchema.partial().parse(req.body);
    const { lines, startDate, endDate, ...rest } = data;

    const contract = await prisma.contract.update({
      where: { id: Number(req.params.id) },
      data: {
        ...rest,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
      },
      include: { lines: { include: { articleType: true } }, client: true, site: true },
    });

    res.json(contract);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.contract.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

// Génère une facture à partir des lignes du contrat (facturation récurrente)
router.post(
  "/:id/generate-invoice",
  asyncHandler(async (req, res) => {
    const contract = await prisma.contract.findUnique({
      where: { id: Number(req.params.id) },
      include: { lines: { include: { articleType: true } }, client: true },
    });
    if (!contract) return res.status(404).json({ message: "Contrat introuvable." });

    const totalHT = contract.lines.reduce(
      (sum, l) => sum + l.quantity * l.unitPrice,
      0
    );
    const tvaRate = 0.18;
    const totalTVA = totalHT * tvaRate;
    const totalTTC = totalHT + totalTVA;

    const count = await prisma.invoice.count();
    const number = buildDocumentNumber("FAC", count + 1);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId: contract.clientId,
        contractId: contract.id,
        dueDate,
        status: "BROUILLON",
        totalHT,
        tvaRate,
        totalTVA,
        totalTTC,
        lines: {
          create: contract.lines.map((l) => ({
            description: `${l.articleType.name} — location-entretien`,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            amountHT: l.quantity * l.unitPrice,
          })),
        },
      },
      include: { lines: true, client: true },
    });

    res.status(201).json(invoice);
  })
);

module.exports = router;
