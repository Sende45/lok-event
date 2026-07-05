import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS unaccent;`);
  console.log("Extension unaccent activée avec succès.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());