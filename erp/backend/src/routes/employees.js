const express = require("express");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  position: z.string().min(1),
  department: z.enum([
    "DIRECTION",
    "COMMERCIAL",
    "PRODUCTION",
    "LOGISTIQUE",
    "ADMINISTRATION",
    "RH",
  ]),
  hireDate: z.string(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  baseSalary: z.number().nonnegative(),
  cnssNumber: z.string().optional().nullable(),
  ipresNumber: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const employees = await prisma.employee.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    res.json(employees);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);
    const employee = await prisma.employee.create({
      data: { ...data, hireDate: new Date(data.hireDate) },
    });
    res.status(201).json(employee);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);
    const employee = await prisma.employee.update({
      where: { id: Number(req.params.id) },
      data: { ...data, ...(data.hireDate ? { hireDate: new Date(data.hireDate) } : {}) },
    });
    res.json(employee);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.employee.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  })
);

module.exports = router;
