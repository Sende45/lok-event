import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.avis.deleteMany();
  await prisma.favori.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.prestataire.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.categorie.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});