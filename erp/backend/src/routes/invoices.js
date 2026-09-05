const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { buildDocumentNumber } = require("../utils/documentNumber");

const router = express.Router();

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative(),
});

const invoiceSchema = z.object({
  clientId: z.number().int(),
  contractId: z.number().int().optional().nullable(),
  dueDate: z.string(),
  lines: z.array(lineSchema).min(1),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, clientId } = req.query;
    const invoices = await prisma.invoice.findMany({
      where: {
        status: status || undefined,
        clientId: clientId ? Number(clientId) : undefined,
      },
      include: { client: true, payments: true },
      orderBy: { issueDate: "desc" },
    });
    res.json(invoices);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: Number(req.params.id) },
      include: { client: true, lines: true, payments: true, contract: true },
    });
    if (!invoice) return res.status(404).json({ message: "Facture introuvable." });
    res.json(invoice);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = invoiceSchema.parse(req.body);
    const totalHT = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const tvaRate = 0.18;
    const totalTVA = totalHT * tvaRate;
    const totalTTC = totalHT + totalTVA;

    const count = await prisma.invoice.count();
    const number = buildDocumentNumber("FAC", count + 1);

    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId: data.clientId,
        contractId: data.contractId ?? undefined,
        dueDate: new Date(data.dueDate),
        totalHT,
        tvaRate,
        totalTVA,
        totalTTC,
        lines: {
          create: data.lines.map((l) => ({
            description: l.description,
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

router.put(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      status: z.enum(["BROUILLON", "ENVOYEE", "PAYEE", "EN_RETARD", "ANNULEE"]),
    });
    const { status } = schema.parse(req.body);
    const invoice = await prisma.invoice.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });
    res.json(invoice);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.invoice.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

// Enregistre un paiement et repasse la facture en PAYEE si le solde est couvert
router.post(
  "/:id/payments",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      amount: z.number().positive(),
      method: z.enum(["VIREMENT", "ESPECES", "MOBILE_MONEY", "CHEQUE"]),
      reference: z.string().optional().nullable(),
      date: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const invoiceId = Number(req.params.id);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });
    if (!invoice) return res.status(404).json({ message: "Facture introuvable." });

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        date: data.date ? new Date(data.date) : undefined,
      },
    });

    const totalPaid =
      invoice.payments.reduce((s, p) => s + p.amount, 0) + data.amount;
    if (totalPaid >= invoice.totalTTC) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "PAYEE" },
      });
    } else if (invoice.status === "BROUILLON") {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "ENVOYEE" },
      });
    }

    res.status(201).json(payment);
  })
);

module.exports = router;
