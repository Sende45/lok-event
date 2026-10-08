"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
//# sourceMappingURL=setup.js.map