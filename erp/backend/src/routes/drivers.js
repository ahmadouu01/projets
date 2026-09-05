const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await prisma.driver.findMany({ orderBy: { name: "asc" } }));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    res.status(201).json(await prisma.driver.create({ data }));
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    res.json(
      await prisma.driver.update({ where: { id: Number(req.params.id) }, data })
    );
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.driver.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

module.exports = router;
