const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const clientSchema = z.object({
  name: z.string().min(1),
  ninea: z.string().optional().nullable(),
  rccm: z.string().optional().nullable(),
  sector: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  city: z.string().optional(),
  region: z.string().optional(),
  contactName: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search } = req.query;
    const clients = await prisma.client.findMany({
      where: search
        ? { name: { contains: String(search), mode: "insensitive" } }
        : undefined,
      include: {
        sites: true,
        _count: { select: { contracts: true, invoices: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json(clients);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        sites: true,
        contracts: { include: { lines: { include: { articleType: true } } } },
        invoices: { orderBy: { issueDate: "desc" }, take: 10 },
        stockItems: { include: { articleType: true } },
      },
    });
    if (!client) return res.status(404).json({ message: "Client introuvable." });
    res.json(client);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = clientSchema.parse(req.body);
    const client = await prisma.client.create({ data });
    res.status(201).json(client);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = clientSchema.partial().parse(req.body);
    const client = await prisma.client.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(client);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.client.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

router.post(
  "/:id/sites",
  asyncHandler(async (req, res) => {
    const siteSchema = z.object({
      name: z.string().min(1),
      address: z.string().min(1),
      city: z.string().optional(),
      region: z.string().optional(),
      contactName: z.string().optional().nullable(),
      contactPhone: z.string().optional().nullable(),
    });
    const data = siteSchema.parse(req.body);
    const site = await prisma.site.create({
      data: { ...data, clientId: Number(req.params.id) },
    });
    res.status(201).json(site);
  })
);

module.exports = router;
