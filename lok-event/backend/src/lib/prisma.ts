import { PrismaClient } from "@prisma/client"

// Définition du type pour l'objet global dans un environnement ESM
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Initialisation de Prisma
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query", "error", "warn"],
  });

// On garde l'instance en cache en développement pour éviter les connexions multiples
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;