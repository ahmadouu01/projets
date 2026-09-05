const express = require("express");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const sites = await prisma.site.findMany({
      include: { client: true },
      orderBy: { name: "asc" },
    });
    res.json(sites);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const site = await prisma.site.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(site);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.site.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

module.exports = router;
