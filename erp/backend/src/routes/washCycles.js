const express = require("express");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cycles = await prisma.washCycle.findMany({
      include: { stockItem: { include: { articleType: true, client: true } } },
      orderBy: { startedAt: "desc" },
      take: 200,
    });
    res.json(cycles);
  })
);

module.exports = router;
