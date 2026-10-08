"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exigerPrestataireVisible = void 0;
const prisma_1 = require("../lib/prisma");
const socket_1 = require("../lib/socket");
const exigerPrestataireVisible = async (req, res, next) => {
    try {
        const prestataireId = req.body?.prestataireId;
        // Pas d'id : on laisse le contrôleur renvoyer son propre message d'erreur
        if (!prestataireId || typeof prestataireId !== "string")
            return next();
        // Les admins ne sont jamais bloqués
        if (req.user?.role === "ADMIN")
            return next();
        const prestataire = await prisma_1.prisma.prestataire.findUnique({
            where: { id: prestataireId },
            select: { user: { select: { estPremium: true, premiumJusquau: true } } },
        });
        // Prestataire introuvable : le contrôleur renverra son 404
        if (!prestataire)
            return next();
        if (!(0, socket_1.premiumEstActif)(prestataire.user)) {
            res.status(403).json({
                message: "Ce prestataire n'est pas encore disponible sur LOKEVENT. Découvrez les prestataires visibles.",
            });
            return;
        }
        next();
    }
    catch (error) {
        console.error("Erreur vérification visibilité prestataire:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};
exports.exigerPrestataireVisible = exigerPrestataireVisible;
//# sourceMappingURL=prestataireVisible.middleware.js.map