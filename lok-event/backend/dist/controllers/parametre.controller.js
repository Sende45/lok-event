"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateParametresPaiement = exports.getParametresPaiement = void 0;
const prisma_1 = require("../lib/prisma");
const CLE_PAIEMENT = "paiement_mobile_money";
const OPERATEURS = ["WAVE", "ORANGE_MONEY", "MTN"];
// Valeurs par défaut tant que l'admin n'a rien configuré
const DEFAUTS = {
    numeros: {
        WAVE: "+225 07 00 00 00 00",
        ORANGE_MONEY: "+225 07 00 00 00 00",
        MTN: "+225 05 00 00 00 00",
    },
    nomCompte: "LOKEVENT",
};
// ─────────────────────────────────────────────────────────────────────────────
// GET /parametres/paiement — PUBLIC
// Utilisé par la page /premium pour afficher le bon numéro selon l'opérateur.
// ─────────────────────────────────────────────────────────────────────────────
const getParametresPaiement = async (_req, res) => {
    try {
        const param = await prisma_1.prisma.parametre.findUnique({
            where: { cle: CLE_PAIEMENT },
        });
        const valeur = param?.valeur || {};
        res.json({
            numeros: { ...DEFAUTS.numeros, ...(valeur.numeros || {}) },
            nomCompte: valeur.nomCompte || DEFAUTS.nomCompte,
        });
    }
    catch (error) {
        console.error("Erreur lecture paramètres paiement:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.getParametresPaiement = getParametresPaiement;
// ─────────────────────────────────────────────────────────────────────────────
// PUT /parametres/paiement — [ADMIN]
// Body : { numeros: { WAVE?, ORANGE_MONEY?, MTN? }, nomCompte? }
// ─────────────────────────────────────────────────────────────────────────────
const updateParametresPaiement = async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            res.status(403).json({ message: "Réservé aux administrateurs" });
            return;
        }
        const { numeros, nomCompte } = req.body;
        // Validation : on n'accepte que les opérateurs connus, en chaînes raisonnables
        const numerosValides = {};
        if (numeros && typeof numeros === "object") {
            for (const op of OPERATEURS) {
                const val = numeros[op];
                if (typeof val === "string" && val.trim()) {
                    if (val.trim().length > 30) {
                        res.status(400).json({ message: `Numéro ${op} trop long (30 caractères max)` });
                        return;
                    }
                    numerosValides[op] = val.trim();
                }
            }
        }
        let nomCompteValide;
        if (nomCompte !== undefined) {
            if (typeof nomCompte !== "string" || nomCompte.trim().length > 60) {
                res.status(400).json({ message: "Nom de compte invalide (60 caractères max)" });
                return;
            }
            nomCompteValide = nomCompte.trim() || DEFAUTS.nomCompte;
        }
        // Fusion avec l'existant pour ne pas écraser un numéro non envoyé
        const existant = await prisma_1.prisma.parametre.findUnique({ where: { cle: CLE_PAIEMENT } });
        const valeurExistante = existant?.valeur || {};
        const nouvelleValeur = {
            numeros: { ...DEFAUTS.numeros, ...(valeurExistante.numeros || {}), ...numerosValides },
            nomCompte: nomCompteValide ?? valeurExistante.nomCompte ?? DEFAUTS.nomCompte,
        };
        await prisma_1.prisma.parametre.upsert({
            where: { cle: CLE_PAIEMENT },
            update: { valeur: nouvelleValeur },
            create: { cle: CLE_PAIEMENT, valeur: nouvelleValeur },
        });
        res.json(nouvelleValeur);
    }
    catch (error) {
        console.error("Erreur mise à jour paramètres paiement:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.updateParametresPaiement = updateParametresPaiement;
//# sourceMappingURL=parametre.controller.js.map