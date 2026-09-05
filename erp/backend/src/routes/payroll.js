const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");
const { computePayroll } = require("../utils/payroll");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { period, employeeId } = req.query;
    const payrolls = await prisma.payroll.findMany({
      where: {
        period: period || undefined,
        employeeId: employeeId ? Number(employeeId) : undefined,
      },
      include: { employee: true },
      orderBy: [{ period: "desc" }, { id: "desc" }],
    });
    res.json(payrolls);
  })
);

// Simule un bulletin sans l'enregistrer (utile pour prévisualiser)
router.post(
  "/simulate",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      baseSalary: z.number().nonnegative(),
      allowances: z.number().nonnegative().optional(),
    });
    const { baseSalary, allowances } = schema.parse(req.body);
    res.json(computePayroll({ baseSalary, allowances }));
  })
);

// Génère les bulletins de paie du mois pour tous les employés actifs
router.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const schema = z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) });
    const { period } = schema.parse(req.body);

    const employees = await prisma.employee.findMany({ where: { active: true } });

    const created = [];
    for (const emp of employees) {
      const calc = computePayroll({ baseSalary: emp.baseSalary, allowances: 0 });
      const payroll = await prisma.payroll.upsert({
        where: { employeeId_period: { employeeId: emp.id, period } },
        update: calc,
        create: { employeeId: emp.id, period, ...calc },
      });
      created.push(payroll);
    }

    res.status(201).json(created);
  })
);

module.exports = router;
