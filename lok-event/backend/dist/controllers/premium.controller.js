"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envoyerAnnoncePremium = exports.desactiverPremium = exports.refuserDemande = exports.validerDemande = exports.getDemandes = exports.souscrire = exports.getMonStatut = exports.getPacks = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const socket_1 = require("../lib/socket");
const notification_controller_1 = require("./notification.controller");
// ─────────────────────────────────────────────────────────────────────────────
// Packs Premium (montants en FCFA — ajuste-les selon ta grille tarifaire)
// ⚠️ Le Premium est réservé aux PRESTATAIRES : ce sont eux les clients payants
// de LOKEVENT. Les organisateurs d'événements utilisent la plateforme gratuitement.
// ─────────────────────────────────────────────────────────────────────────────
const PACKS = {
    MENSUEL: { montant: 25000, dureeMois: 1, label: "Pack Mensuel" },
    TRIMESTRIEL: { montant: 60000, dureeMois: 3, label: "Pack Trimestriel" },
    ANNUEL: { montant: 240000, dureeMois: 12, label: "Pack Annuel" },
};
const MOYENS_PAIEMENT = ["WAVE", "ORANGE_MONEY", "MTN", "ESPECES"];
// ─────────────────────────────────────────────────────────────────────────────
// GET /premium/packs — liste publique des packs (pour la page d'abonnement)
// ─────────────────────────────────────────────────────────────────────────────
const getPacks = async (_req, res) => {
    res.json(Object.entries(PACKS).map(([code, p]) => ({
        code,
        label: p.label,
        montant: p.montant,
        dureeMois: p.dureeMois,
    })));
};
exports.getPacks = getPacks;
// ─────────────────────────────────────────────────────────────────────────────
// GET /premium/statut — mon statut Premium (avec expiration paresseuse :
// si la date est dépassée, on rétrograde automatiquement, pas besoin de cron)
// ─────────────────────────────────────────────────────────────────────────────
const getMonStatut = async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, estPremium: true, premiumJusquau: true },
        });
        if (!user) {
            res.status(404).json({ message: "Utilisateur non trouvé" });
            return;
        }
        // Expiration paresseuse
        if (user.estPremium && user.premiumJusquau && user.premiumJusquau <= new Date()) {
            await prisma_1.prisma.$transaction([
                prisma_1.prisma.user.update({
                    where: { id: user.id },
                    data: { estPremium: false },
                }),
                prisma_1.prisma.abonnement.updateMany({
                    where: { userId: user.id, statut: "ACTIF", finLe: { lte: new Date() } },
                    data: { statut: "EXPIRE" },
                }),
            ]);
            await (0, socket_1.rafraichirRoomPremium)(user.id, false);
            res.json({ estPremium: false, premiumJusquau: null, expire: true });
            return;
        }
        // Demande en attente éventuelle (pour afficher "en cours de validation")
        const demandeEnAttente = await prisma_1.prisma.abonnement.findFirst({
            where: { userId: user.id, statut: "EN_ATTENTE" },
            orderBy: { createdAt: "desc" },
            select: { id: true, pack: true, montant: true, createdAt: true },
        });
        res.json({
            estPremium: (0, socket_1.premiumEstActif)(user),
            premiumJusquau: user.premiumJusquau,
            demandeEnAttente,
        });
    }
    catch (error) {
        console.error("Erreur statut premium:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.getMonStatut = getMonStatut;
// ─────────────────────────────────────────────────────────────────────────────
// POST /premium/souscrire — le PRESTATAIRE choisit un pack et déclare son
// paiement mobile money. L'abonnement est créé EN_ATTENTE jusqu'à validation
// admin. Réservé aux comptes ayant un profil prestataire.
// Body : { pack, moyenPaiement, referencePaiement? }
// ─────────────────────────────────────────────────────────────────────────────
const souscrire = async (req, res) => {
    try {
        const { pack, moyenPaiement, referencePaiement } = req.body;
        // ⚠️ Garde métier : le Premium est réservé aux prestataires.
        // Un compte organisateur (sans profil prestataire) ne peut pas souscrire.
        const prestataire = await prisma_1.prisma.prestataire.findUnique({
            where: { userId: req.user.id },
            select: { id: true },
        });
        if (!prestataire) {
            res.status(403).json({
                message: "Le Premium est réservé aux prestataires. Créez d'abord votre profil prestataire pour souscrire à un pack.",
            });
            return;
        }
        const packInfo = PACKS[pack];
        if (!packInfo) {
            res.status(400).json({
                message: `Pack invalide. Valeurs acceptées : ${Object.keys(PACKS).join(", ")}`,
            });
            return;
        }
        if (!moyenPaiement || !MOYENS_PAIEMENT.includes(moyenPaiement)) {
            res.status(400).json({
                message: `Moyen de paiement invalide. Valeurs acceptées : ${MOYENS_PAIEMENT.join(", ")}`,
            });
            return;
        }
        // Déjà premium actif ?
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { estPremium: true, premiumJusquau: true },
        });
        if (user && (0, socket_1.premiumEstActif)(user)) {
            res.status(400).json({
                message: "Vous êtes déjà Premium. Attendez l'expiration pour renouveler.",
            });
            return;
        }
        // Une seule demande en attente à la fois
        const demandeExistante = await prisma_1.prisma.abonnement.findFirst({
            where: { userId: req.user.id, statut: "EN_ATTENTE" },
        });
        if (demandeExistante) {
            res.status(400).json({
                message: "Vous avez déjà une demande en cours de validation.",
            });
            return;
        }
        const abonnement = await prisma_1.prisma.abonnement.create({
            data: {
                userId: req.user.id,
                pack,
                montant: packInfo.montant,
                moyenPaiement,
                referencePaiement: referencePaiement || undefined,
            },
        });
        // Notifier tous les ADMIN qu'une demande attend validation
        const admins = await prisma_1.prisma.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true },
        });
        for (const admin of admins) {
            (0, notification_controller_1.sendNotification)(admin.id, "PREMIUM", "Nouvelle demande Premium 💎", `${packInfo.label} (${packInfo.montant.toLocaleString("fr-FR")} FCFA) via ${moyenPaiement} — en attente de validation`, { abonnementId: abonnement.id });
        }
        res.status(201).json({
            message: "Demande enregistrée. Votre Premium sera activé dès validation du paiement par notre équipe.",
            abonnement,
        });
    }
    catch (error) {
        console.error("Erreur souscription premium:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.souscrire = souscrire;
// ─────────────────────────────────────────────────────────────────────────────
// GET /premium/demandes — [ADMIN] liste des demandes (filtre ?statut=EN_ATTENTE)
// ─────────────────────────────────────────────────────────────────────────────
const getDemandes = async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            res.status(403).json({ message: "Réservé aux administrateurs" });
            return;
        }
        // Validation + typage du filtre contre l'enum Prisma (sinon TS2322 :
        // un `string` quelconque n'est pas assignable à StatutAbonnement)
        const statutParam = req.query.statut;
        let statut;
        if (statutParam) {
            if (!Object.values(client_1.StatutAbonnement).includes(statutParam)) {
                res.status(400).json({
                    message: `Statut invalide. Valeurs acceptées : ${Object.values(client_1.StatutAbonnement).join(", ")}`,
                });
                return;
            }
            statut = statutParam;
        }
        const demandes = await prisma_1.prisma.abonnement.findMany({
            where: statut ? { statut } : {},
            include: {
                user: { select: { id: true, nom: true, prenom: true, email: true, telephone: true } },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(demandes);
    }
    catch (error) {
        console.error("Erreur liste demandes premium:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.getDemandes = getDemandes;
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /premium/demandes/:id/valider — [ADMIN] paiement vérifié → activation
// ─────────────────────────────────────────────────────────────────────────────
const validerDemande = async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            res.status(403).json({ message: "Réservé aux administrateurs" });
            return;
        }
        const abonnementId = req.params.id;
        const abonnement = await prisma_1.prisma.abonnement.findUnique({
            where: { id: abonnementId },
        });
        if (!abonnement) {
            res.status(404).json({ message: "Demande non trouvée" });
            return;
        }
        if (abonnement.statut !== "EN_ATTENTE") {
            res.status(400).json({ message: `Cette demande est déjà ${abonnement.statut}` });
            return;
        }
        const packInfo = PACKS[abonnement.pack];
        const debut = new Date();
        const fin = new Date(debut);
        fin.setMonth(fin.getMonth() + (packInfo?.dureeMois || 1));
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.abonnement.update({
                where: { id: abonnementId },
                data: { statut: "ACTIF", debutLe: debut, finLe: fin },
            }),
            prisma_1.prisma.user.update({
                where: { id: abonnement.userId },
                data: { estPremium: true, premiumJusquau: fin },
            }),
        ]);
        // Fait rejoindre la room aux sessions déjà connectées, sans reconnexion
        await (0, socket_1.rafraichirRoomPremium)(abonnement.userId, true);
        (0, notification_controller_1.sendNotification)(abonnement.userId, "PREMIUM", "Bienvenue dans LOKEVENT Premium 💎", `Votre ${packInfo?.label || abonnement.pack} est actif jusqu'au ${fin.toLocaleDateString("fr-FR")}. Profitez de vos avantages exclusifs !`, { abonnementId });
        res.json({ message: "Premium activé", finLe: fin });
    }
    catch (error) {
        console.error("Erreur validation premium:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.validerDemande = validerDemande;
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /premium/demandes/:id/refuser — [ADMIN] paiement introuvable → refus
// ─────────────────────────────────────────────────────────────────────────────
const refuserDemande = async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            res.status(403).json({ message: "Réservé aux administrateurs" });
            return;
        }
        const abonnementId = req.params.id;
        const { motif } = req.body;
        const abonnement = await prisma_1.prisma.abonnement.findUnique({
            where: { id: abonnementId },
        });
        if (!abonnement) {
            res.status(404).json({ message: "Demande non trouvée" });
            return;
        }
        if (abonnement.statut !== "EN_ATTENTE") {
            res.status(400).json({ message: `Cette demande est déjà ${abonnement.statut}` });
            return;
        }
        await prisma_1.prisma.abonnement.update({
            where: { id: abonnementId },
            data: { statut: "REFUSE" },
        });
        (0, notification_controller_1.sendNotification)(abonnement.userId, "PREMIUM", "Demande Premium non validée", motif ||
            "Nous n'avons pas pu vérifier votre paiement. Vérifiez la référence de transaction et réessayez, ou contactez le support.", { abonnementId });
        res.json({ message: "Demande refusée" });
    }
    catch (error) {
        console.error("Erreur refus premium:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.refuserDemande = refuserDemande;
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /premium/utilisateurs/:userId/desactiver — [ADMIN] révocation manuelle
// ─────────────────────────────────────────────────────────────────────────────
const desactiverPremium = async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            res.status(403).json({ message: "Réservé aux administrateurs" });
            return;
        }
        const userId = req.params.userId;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, estPremium: true },
        });
        if (!user) {
            res.status(404).json({ message: "Utilisateur non trouvé" });
            return;
        }
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({
                where: { id: userId },
                data: { estPremium: false, premiumJusquau: null },
            }),
            prisma_1.prisma.abonnement.updateMany({
                where: { userId, statut: "ACTIF" },
                data: { statut: "EXPIRE", finLe: new Date() },
            }),
        ]);
        await (0, socket_1.rafraichirRoomPremium)(userId, false);
        res.json({ message: "Premium désactivé" });
    }
    catch (error) {
        console.error("Erreur désactivation premium:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.desactiverPremium = desactiverPremium;
// ─────────────────────────────────────────────────────────────────────────────
// POST /premium/annonce — [ADMIN] diffuse une annonce exclusive à TOUS les
// Premium : temps réel via la room + notification persistée pour chacun.
// Body : { titre, message, data? }
// ─────────────────────────────────────────────────────────────────────────────
const envoyerAnnoncePremium = async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            res.status(403).json({ message: "Réservé aux administrateurs" });
            return;
        }
        const { titre, message, data } = req.body;
        if (!titre || !message) {
            res.status(400).json({ message: "Titre et message sont requis" });
            return;
        }
        // Tous les Premium actifs (connectés ou non : la notification persistée
        // sera vue à leur prochaine connexion)
        const premiums = await prisma_1.prisma.user.findMany({
            where: {
                estPremium: true,
                OR: [{ premiumJusquau: null }, { premiumJusquau: { gt: new Date() } }],
            },
            select: { id: true },
        });
        for (const p of premiums) {
            (0, notification_controller_1.sendNotification)(p.id, "PREMIUM", titre, message, data);
        }
        // Diffusion temps réel à la room (sessions connectées)
        (0, socket_1.emitToPremium)("notification:premium", { titre, message, data });
        res.json({ message: `Annonce envoyée à ${premiums.length} membre(s) Premium` });
    }
    catch (error) {
        console.error("Erreur annonce premium:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.envoyerAnnoncePremium = envoyerAnnoncePremium;
//# sourceMappingURL=premium.controller.js.map