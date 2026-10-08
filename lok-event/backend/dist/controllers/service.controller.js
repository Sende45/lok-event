"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteService = exports.updateService = exports.createService = exports.getMesServices = void 0;
const prisma_1 = require("../lib/prisma");
const UNITES_VALIDES = ["forfait", "par personne", "par heure", "par jour"];
const MAX_SERVICES = 20;
async function getPrestataireDuUser(userId) {
    return prisma_1.prisma.prestataire.findUnique({
        where: { userId },
        select: { id: true },
    });
}
// PRESTATAIRE — liste de ses propres services (actifs et inactifs)
const getMesServices = async (req, res) => {
    try {
        const prestataire = await getPrestataireDuUser(req.user.id);
        if (!prestataire) {
            res.status(404).json({ message: "Prestataire non trouvé" });
            return;
        }
        const services = await prisma_1.prisma.service.findMany({
            where: { prestataireId: prestataire.id },
            orderBy: { prix: "asc" },
        });
        res.json(services);
    }
    catch (error) {
        console.error("Erreur mes services:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.getMesServices = getMesServices;
// PRESTATAIRE — créer un service
const createService = async (req, res) => {
    try {
        const { nom, description, prix, unite } = req.body;
        if (!nom || !nom.trim()) {
            res.status(400).json({ message: "Le nom de la prestation est requis" });
            return;
        }
        const prixNum = parseFloat(prix);
        if (isNaN(prixNum) || prixNum <= 0) {
            res.status(400).json({ message: "Le prix doit être un nombre positif" });
            return;
        }
        if (prixNum > 1000000000) {
            res.status(400).json({ message: "Prix invraisemblable, vérifiez le montant" });
            return;
        }
        if (unite && !UNITES_VALIDES.includes(unite)) {
            res.status(400).json({
                message: `Unité invalide. Valeurs acceptées : ${UNITES_VALIDES.join(", ")}`,
            });
            return;
        }
        const prestataire = await getPrestataireDuUser(req.user.id);
        if (!prestataire) {
            res.status(404).json({ message: "Prestataire non trouvé" });
            return;
        }
        const nbServices = await prisma_1.prisma.service.count({
            where: { prestataireId: prestataire.id },
        });
        if (nbServices >= MAX_SERVICES) {
            res.status(400).json({
                message: `Maximum ${MAX_SERVICES} prestations. Supprimez-en une avant d'en ajouter.`,
            });
            return;
        }
        const service = await prisma_1.prisma.service.create({
            data: {
                prestataireId: prestataire.id,
                nom: nom.trim(),
                description: description?.trim() || undefined,
                prix: prixNum,
                unite: unite || undefined,
            },
        });
        res.status(201).json(service);
    }
    catch (error) {
        console.error("Erreur création service:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.createService = createService;
// PRESTATAIRE — modifier un service (le sien uniquement)
const updateService = async (req, res) => {
    try {
        const serviceId = req.params.id;
        const { nom, description, prix, unite, actif } = req.body;
        const prestataire = await getPrestataireDuUser(req.user.id);
        if (!prestataire) {
            res.status(404).json({ message: "Prestataire non trouvé" });
            return;
        }
        const service = await prisma_1.prisma.service.findFirst({
            where: { id: serviceId, prestataireId: prestataire.id },
        });
        if (!service) {
            res.status(404).json({ message: "Prestation non trouvée" });
            return;
        }
        let prixNum;
        if (prix !== undefined) {
            prixNum = parseFloat(prix);
            if (isNaN(prixNum) || prixNum <= 0) {
                res.status(400).json({ message: "Le prix doit être un nombre positif" });
                return;
            }
        }
        if (unite && !UNITES_VALIDES.includes(unite)) {
            res.status(400).json({
                message: `Unité invalide. Valeurs acceptées : ${UNITES_VALIDES.join(", ")}`,
            });
            return;
        }
        const updated = await prisma_1.prisma.service.update({
            where: { id: serviceId },
            data: {
                nom: nom?.trim() || undefined,
                description: description !== undefined ? description?.trim() || null : undefined,
                prix: prixNum,
                unite: unite || undefined,
                actif: typeof actif === "boolean" ? actif : undefined,
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error("Erreur modification service:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.updateService = updateService;
// PRESTATAIRE — supprimer un service (le sien uniquement)
const deleteService = async (req, res) => {
    try {
        const serviceId = req.params.id;
        const prestataire = await getPrestataireDuUser(req.user.id);
        if (!prestataire) {
            res.status(404).json({ message: "Prestataire non trouvé" });
            return;
        }
        const supprime = await prisma_1.prisma.service.deleteMany({
            where: { id: serviceId, prestataireId: prestataire.id },
        });
        if (supprime.count === 0) {
            res.status(404).json({ message: "Prestation non trouvée" });
            return;
        }
        res.json({ message: "Prestation supprimée" });
    }
    catch (error) {
        console.error("Erreur suppression service:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.deleteService = deleteService;
//# sourceMappingURL=service.controller.js.map