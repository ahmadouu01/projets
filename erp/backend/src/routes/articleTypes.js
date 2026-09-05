const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const schema = z.object({
  name: z.string().min(1),
  category: z.enum(["VETEMENT_TRAVAIL", "LINGE_PLAT", "TAPIS", "HYGIENE"]),
  replacementCost: z.number().nonnegative(),
  rentalPrice: z.number().nonnegative(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await prisma.articleType.findMany({
      include: { _count: { select: { stockItems: true } } },
      orderBy: { name: "asc" },
    });
    res.json(items);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const item = await prisma.articleType.create({ data });
    res.status(201).json(item);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    const item = await prisma.articleType.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(item);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.articleType.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

module.exports = router;
