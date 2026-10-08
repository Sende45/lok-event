"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debloquerDate = exports.bloquerDate = exports.getMesIndisponibilites = exports.getDisponibilitesPubliques = void 0;
const prisma_1 = require("../lib/prisma");
// Normalise une date à minuit UTC pour comparer jour par jour
function jourUTC(input) {
    const d = new Date(input);
    if (isNaN(d.getTime()))
        return null;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
// PUBLIC — dates indisponibles d'un prestataire (blocages manuels + réservations confirmées)
// Réponse :
// - datesIndisponibles : liste FUSIONNÉE (blocages + réservées) — format historique,
//   toujours renvoyée telle quelle pour ne pas casser la fiche détail prestataire.
// - datesReservees : sous-ensemble occupé par une réservation CONFIRMEE — permet au
//   calendrier du dashboard client de distinguer "bloqué" (rouge) de "réservé" (jaune).
//   Aucune info client ne fuite : uniquement des dates.
const getDisponibilitesPubliques = async (req, res) => {
    try {
        const prestataireId = req.params.prestataireId;
        const aujourdhui = jourUTC(new Date());
        const [blocages, reservationsConfirmees] = await Promise.all([
            prisma_1.prisma.indisponibilite.findMany({
                where: { prestataireId, date: { gte: aujourdhui } },
                select: { date: true },
            }),
            prisma_1.prisma.reservation.findMany({
                where: {
                    prestataireId,
                    statut: "CONFIRMEE",
                    dateEvenement: { gte: aujourdhui },
                },
                select: { dateEvenement: true },
            }),
        ]);
        // Fusion + dédoublonnage au format YYYY-MM-DD
        const dates = new Set();
        const reservees = new Set();
        blocages.forEach((b) => dates.add(b.date.toISOString().split("T")[0]));
        reservationsConfirmees.forEach((r) => {
            const jour = r.dateEvenement.toISOString().split("T")[0];
            dates.add(jour);
            reservees.add(jour);
        });
        res.json({
            datesIndisponibles: [...dates].sort(),
            datesReservees: [...reservees].sort(),
        });
    }
    catch (error) {
        console.error("Erreur disponibilités publiques:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.getDisponibilitesPubliques = getDisponibilitesPubliques;
// PRESTATAIRE — liste de ses propres blocages manuels
const getMesIndisponibilites = async (req, res) => {
    try {
        const prestataire = await prisma_1.prisma.prestataire.findUnique({
            where: { userId: req.user.id },
            select: { id: true },
        });
        if (!prestataire) {
            res.status(404).json({ message: "Prestataire non trouvé" });
            return;
        }
        const blocages = await prisma_1.prisma.indisponibilite.findMany({
            where: { prestataireId: prestataire.id },
            orderBy: { date: "asc" },
        });
        res.json(blocages);
    }
    catch (error) {
        console.error("Erreur mes indisponibilités:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.getMesIndisponibilites = getMesIndisponibilites;
// PRESTATAIRE — bloquer une date
const bloquerDate = async (req, res) => {
    try {
        const { date, motif } = req.body;
        const jour = jourUTC(date);
        if (!jour) {
            res.status(400).json({ message: "Date invalide" });
            return;
        }
        const aujourdhui = jourUTC(new Date());
        if (jour < aujourdhui) {
            res.status(400).json({ message: "Impossible de bloquer une date passée" });
            return;
        }
        const prestataire = await prisma_1.prisma.prestataire.findUnique({
            where: { userId: req.user.id },
            select: { id: true },
        });
        if (!prestataire) {
            res.status(404).json({ message: "Prestataire non trouvé" });
            return;
        }
        // upsert grâce à l'unique [prestataireId, date] : re-bloquer ne crée pas de doublon
        const blocage = await prisma_1.prisma.indisponibilite.upsert({
            where: {
                prestataireId_date: { prestataireId: prestataire.id, date: jour },
            },
            update: { motif: motif || undefined },
            create: { prestataireId: prestataire.id, date: jour, motif: motif || undefined },
        });
        res.status(201).json(blocage);
    }
    catch (error) {
        console.error("Erreur blocage date:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.bloquerDate = bloquerDate;
// PRESTATAIRE — débloquer une date (par sa valeur YYYY-MM-DD)
const debloquerDate = async (req, res) => {
    try {
        const jour = jourUTC(req.params.date);
        if (!jour) {
            res.status(400).json({ message: "Date invalide" });
            return;
        }
        const prestataire = await prisma_1.prisma.prestataire.findUnique({
            where: { userId: req.user.id },
            select: { id: true },
        });
        if (!prestataire) {
            res.status(404).json({ message: "Prestataire non trouvé" });
            return;
        }
        await prisma_1.prisma.indisponibilite.deleteMany({
            where: { prestataireId: prestataire.id, date: jour },
        });
        res.json({ message: "Date débloquée" });
    }
    catch (error) {
        console.error("Erreur déblocage date:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
exports.debloquerDate = debloquerDate;
//# sourceMappingURL=disponibilite.controller.js.map