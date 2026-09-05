const { PrismaClient } = require("@prisma/client");

// Instance unique du client Prisma, réutilisée dans toute l'application
// (évite d'épuiser le pool de connexions en développement avec nodemon).
const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

module.exports = prisma;
