const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const schema = z.object({
  code: z.string().min(1),
  articleTypeId: z.number().int(),
  clientId: z.number().int().optional().nullable(),
  status: z
    .enum(["EN_STOCK", "EN_SERVICE", "EN_LAVAGE", "HORS_SERVICE", "PERDU"])
    .optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, articleTypeId, clientId } = req.query;
    const items = await prisma.stockItem.findMany({
      where: {
        status: status || undefined,
        articleTypeId: articleTypeId ? Number(articleTypeId) : undefined,
        clientId: clientId ? Number(clientId) : undefined,
      },
      include: { articleType: true, client: true },
      orderBy: { id: "desc" },
      take: 500,
    });
    res.json(items);
  })
);

// Répartition du parc d'articles par statut, pour le tableau de bord production
router.get(
  "/stats/by-status",
  asyncHandler(async (req, res) => {
    const rows = await prisma.stockItem.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    res.json(rows.map((r) => ({ status: r.status, count: r._count._all })));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const item = await prisma.stockItem.create({ data });
    res.status(201).json(item);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    const item = await prisma.stockItem.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(item);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.stockItem.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

// Démarre un cycle de lavage : passe l'article en EN_LAVAGE et crée le cycle
router.post(
  "/:id/wash/start",
  asyncHandler(async (req, res) => {
    const stockItemId = Number(req.params.id);
    const [item] = await prisma.$transaction([
      prisma.stockItem.update({
        where: { id: stockItemId },
        data: { status: "EN_LAVAGE" },
      }),
      prisma.washCycle.create({ data: { stockItemId } }),
    ]);
    res.json(item);
  })
);

// Termine le cycle de lavage en cours : OK -> retour en stock, REBUT -> hors service
router.post(
  "/:id/wash/finish",
  asyncHandler(async (req, res) => {
    const stockItemId = Number(req.params.id);
    const resultSchema = z.object({ result: z.enum(["OK", "REBUT"]) });
    const { result } = resultSchema.parse(req.body);

    const cycle = await prisma.washCycle.findFirst({
      where: { stockItemId, finishedAt: null },
      orderBy: { startedAt: "desc" },
    });

    const updates = [
      prisma.stockItem.update({
        where: { id: stockItemId },
        data: {
          status: result === "OK" ? "EN_STOCK" : "HORS_SERVICE",
          washCount: { increment: 1 },
          lastWashDate: new Date(),
        },
      }),
    ];
    if (cycle) {
      updates.push(
        prisma.washCycle.update({
          where: { id: cycle.id },
          data: { finishedAt: new Date(), result },
        })
      );
    }

    const [item] = await prisma.$transaction(updates);
    res.json(item);
  })
);

module.exports = router;
