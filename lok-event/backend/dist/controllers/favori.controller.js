"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFavori = exports.addFavori = exports.getMesFavoris = void 0;
const prisma_1 = require("../lib/prisma");
const getMesFavoris = async (req, res) => {
    try {
        const favoris = await prisma_1.prisma.favori.findMany({
            where: { clientId: req.user.id },
            include: {
                prestataire: {
                    include: { categorie: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(favoris);
    }
    catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.getMesFavoris = getMesFavoris;
const addFavori = async (req, res) => {
    try {
        const { prestataireId } = req.body;
        const existant = await prisma_1.prisma.favori.findUnique({
            where: {
                clientId_prestataireId: {
                    clientId: req.user.id,
                    prestataireId,
                },
            },
        });
        if (existant) {
            res.status(400).json({ message: "Déjà dans vos favoris" });
            return;
        }
        const favori = await prisma_1.prisma.favori.create({
            data: { clientId: req.user.id, prestataireId },
            include: { prestataire: { include: { categorie: true } } },
        });
        res.status(201).json(favori);
    }
    catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.addFavori = addFavori;
const removeFavori = async (req, res) => {
    try {
        const prestataireId = req.params.prestataireId;
        await prisma_1.prisma.favori.delete({
            where: {
                clientId_prestataireId: {
                    clientId: req.user.id,
                    prestataireId,
                },
            },
        });
        res.json({ message: "Retiré des favoris" });
    }
    catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.removeFavori = removeFavori;
//# sourceMappingURL=favori.controller.js.map