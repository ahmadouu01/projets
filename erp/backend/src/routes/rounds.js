const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const stopSchema = z.object({
  clientId: z.number().int(),
  siteId: z.number().int().optional().nullable(),
  sequence: z.number().int().optional(),
  plannedTime: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const roundSchema = z.object({
  name: z.string().min(1),
  date: z.string(),
  zone: z.string().optional(),
  vehicleId: z.number().int().optional().nullable(),
  driverId: z.number().int().optional().nullable(),
  stops: z.array(stopSchema).default([]),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { date, status } = req.query;
    const rounds = await prisma.round.findMany({
      where: {
        status: status || undefined,
        date: date
          ? {
              gte: new Date(`${date}T00:00:00`),
              lt: new Date(`${date}T23:59:59`),
            }
          : undefined,
      },
      include: {
        vehicle: true,
        driver: true,
        stops: { include: { client: true, site: true }, orderBy: { sequence: "asc" } },
      },
      orderBy: { date: "desc" },
    });
    res.json(rounds);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const round = await prisma.round.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        vehicle: true,
        driver: true,
        stops: { include: { client: true, site: true }, orderBy: { sequence: "asc" } },
      },
    });
    if (!round) return res.status(404).json({ message: "Tournée introuvable." });
    res.json(round);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = roundSchema.parse(req.body);
    const round = await prisma.round.create({
      data: {
        name: data.name,
        date: new Date(data.date),
        zone: data.zone,
        vehicleId: data.vehicleId ?? undefined,
        driverId: data.driverId ?? undefined,
        stops: {
          create: data.stops.map((s, idx) => ({
            clientId: s.clientId,
            siteId: s.siteId ?? undefined,
            sequence: s.sequence ?? idx + 1,
            plannedTime: s.plannedTime ? new Date(s.plannedTime) : undefined,
            notes: s.notes,
          })),
        },
      },
      include: { stops: { include: { client: true, site: true } }, vehicle: true, driver: true },
    });
    res.status(201).json(round);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().optional(),
      date: z.string().optional(),
      zone: z.string().optional(),
      vehicleId: z.number().int().optional().nullable(),
      driverId: z.number().int().optional().nullable(),
      status: z.enum(["PLANIFIEE", "EN_COURS", "TERMINEE", "ANNULEE"]).optional(),
    });
    const data = schema.parse(req.body);
    const round = await prisma.round.update({
      where: { id: Number(req.params.id) },
      data: { ...data, ...(data.date ? { date: new Date(data.date) } : {}) },
      include: { stops: { include: { client: true, site: true } }, vehicle: true, driver: true },
    });
    res.json(round);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.round.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

router.put(
  "/:roundId/stops/:stopId",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      status: z.enum(["A_FAIRE", "LIVRE", "ECHEC"]),
      notes: z.string().optional().nullable(),
    });
    const data = schema.parse(req.body);
    const stop = await prisma.roundStop.update({
      where: { id: Number(req.params.stopId) },
      data,
    });
    res.json(stop);
  })
);

module.exports = router;
