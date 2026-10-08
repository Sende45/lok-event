"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// Définition du type pour l'objet global dans un environnement ESM
const globalForPrisma = globalThis;
// Initialisation de Prisma
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        log: ["query", "error", "warn"],
    });
// On garde l'instance en cache en développement pour éviter les connexions multiples
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = exports.prisma;
}
exports.default = exports.prisma;
//# sourceMappingURL=prisma.js.map