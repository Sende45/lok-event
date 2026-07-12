// backend/src/controllers/disponibilite.controller.ts
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// Normalise une date à minuit UTC pour comparer jour par jour
function jourUTC(input: string | Date): Date | null {
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// PUBLIC — dates indisponibles d'un prestataire (blocages manuels + réservations confirmées)
// Réponse :
// - datesIndisponibles : liste FUSIONNÉE (blocages + réservées) — format historique,
//   toujours renvoyée telle quelle pour ne pas casser la fiche détail prestataire.
// - datesReservees : sous-ensemble occupé par une réservation CONFIRMEE — permet au
//   calendrier du dashboard client de distinguer "bloqué" (rouge) de "réservé" (jaune).
//   Aucune info client ne fuite : uniquement des dates.
export const getDisponibilitesPubliques = async (req: Request, res: Response) => {
  try {
    const prestataireId = req.params.prestataireId as string;
    const aujourdhui = jourUTC(new Date())!;

    const [blocages, reservationsConfirmees] = await Promise.all([
      prisma.indisponibilite.findMany({
        where: { prestataireId, date: { gte: aujourdhui } },
        select: { date: true },
      }),
      prisma.reservation.findMany({
        where: {
          prestataireId,
          statut: "CONFIRMEE",
          dateEvenement: { gte: aujourdhui },
        },
        select: { dateEvenement: true },
      }),
    ]);

    // Fusion + dédoublonnage au format YYYY-MM-DD
    const dates = new Set<string>();
    const reservees = new Set<string>();
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
  } catch (error) {
    console.error("Erreur disponibilités publiques:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// PRESTATAIRE — liste de ses propres blocages manuels
export const getMesIndisponibilites = async (req: Request, res: Response) => {
  try {
    const prestataire = await prisma.prestataire.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const blocages = await prisma.indisponibilite.findMany({
      where: { prestataireId: prestataire.id },
      orderBy: { date: "asc" },
    });

    res.json(blocages);
  } catch (error) {
    console.error("Erreur mes indisponibilités:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// PRESTATAIRE — bloquer une date
export const bloquerDate = async (req: Request, res: Response) => {
  try {
    const { date, motif } = req.body;

    const jour = jourUTC(date);
    if (!jour) {
      res.status(400).json({ message: "Date invalide" });
      return;
    }
    const aujourdhui = jourUTC(new Date())!;
    if (jour < aujourdhui) {
      res.status(400).json({ message: "Impossible de bloquer une date passée" });
      return;
    }

    const prestataire = await prisma.prestataire.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    // upsert grâce à l'unique [prestataireId, date] : re-bloquer ne crée pas de doublon
    const blocage = await prisma.indisponibilite.upsert({
      where: {
        prestataireId_date: { prestataireId: prestataire.id, date: jour },
      },
      update: { motif: motif || undefined },
      create: { prestataireId: prestataire.id, date: jour, motif: motif || undefined },
    });

    res.status(201).json(blocage);
  } catch (error) {
    console.error("Erreur blocage date:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// PRESTATAIRE — débloquer une date (par sa valeur YYYY-MM-DD)
export const debloquerDate = async (req: Request, res: Response) => {
  try {
    const jour = jourUTC(req.params.date as string);
    if (!jour) {
      res.status(400).json({ message: "Date invalide" });
      return;
    }

    const prestataire = await prisma.prestataire.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    await prisma.indisponibilite.deleteMany({
      where: { prestataireId: prestataire.id, date: jour },
    });

    res.json({ message: "Date débloquée" });
  } catch (error) {
    console.error("Erreur déblocage date:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};