const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const schema = z.object({
  plate: z.string().min(1),
  model: z.string().min(1),
  capacity: z.number().int().positive(),
  status: z
    .enum(["DISPONIBLE", "EN_TOURNEE", "MAINTENANCE", "HORS_SERVICE"])
    .optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await prisma.vehicle.findMany({ orderBy: { plate: "asc" } }));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    res.status(201).json(await prisma.vehicle.create({ data }));
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    res.json(
      await prisma.vehicle.update({ where: { id: Number(req.params.id) }, data })
    );
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.vehicle.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

module.exports = router;
