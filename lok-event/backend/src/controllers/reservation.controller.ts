// backend/src/controllers/reservation.controller.ts
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { sendNotification } from "./notification.controller";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const STATUTS_VALIDES = ["EN_ATTENTE", "CONFIRMEE", "ANNULEE", "TERMINEE"];

// Transitions autorisées pour le prestataire :
// EN_ATTENTE -> CONFIRMEE (accepter) ou ANNULEE (refuser)
// CONFIRMEE  -> TERMINEE (prestation faite) ou ANNULEE (imprévu)
// TERMINEE / ANNULEE -> états finaux, plus de changement
const TRANSITIONS_PRESTATAIRE: Record<string, string[]> = {
  EN_ATTENTE: ["CONFIRMEE", "ANNULEE"],
  CONFIRMEE: ["TERMINEE", "ANNULEE"],
  TERMINEE: [],
  ANNULEE: [],
};

/** Bornes UTC du jour d'une date (pour comparer des dates de journée entière) */
function bornesJourUTC(date: Date): { debut: Date; fin: Date } {
  const debut = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const fin = new Date(debut);
  fin.setUTCDate(fin.getUTCDate() + 1);
  return { debut, fin };
}

/**
 * Vérifie si une date est prise pour un prestataire :
 * - bloquée manuellement (Indisponibilite)
 * - ou occupée par une réservation CONFIRMEE (en excluant éventuellement
 *   une réservation donnée, utile lors de la confirmation elle-même)
 */
async function dateEstPrise(
  prestataireId: string,
  date: Date,
  excludeReservationId?: string
): Promise<boolean> {
  const { debut, fin } = bornesJourUTC(date);

  const [dateBloquee, dateConfirmee] = await Promise.all([
    prisma.indisponibilite.findFirst({
      where: { prestataireId, date: { gte: debut, lt: fin } },
    }),
    prisma.reservation.findFirst({
      where: {
        prestataireId,
        statut: "CONFIRMEE",
        dateEvenement: { gte: debut, lt: fin },
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      },
    }),
  ]);

  return Boolean(dateBloquee || dateConfirmee);
}

export const creerReservation = async (req: AuthRequest, res: Response) => {
  try {
    const {
      prestataireId,
      dateEvenement,
      lieuEvenement,
      typeEvenement,
      nombrePersonnes,
      message,
      budget,
    } = req.body;

    if (!prestataireId || !dateEvenement || !lieuEvenement || !typeEvenement) {
      res.status(400).json({
        message: "Prestataire, date, lieu et type d'événement sont requis",
      });
      return;
    }

    // La date doit être valide et dans le futur
    const date = new Date(dateEvenement);
    if (isNaN(date.getTime())) {
      res.status(400).json({ message: "Date d'événement invalide" });
      return;
    }
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    if (date < aujourdhui) {
      res.status(400).json({ message: "La date de l'événement doit être dans le futur" });
      return;
    }

    // Validation des champs numériques optionnels (éviter NaN -> erreur Prisma 500)
    let nombrePersonnesInt: number | undefined;
    if (nombrePersonnes !== undefined && nombrePersonnes !== null && nombrePersonnes !== "") {
      nombrePersonnesInt = parseInt(nombrePersonnes, 10);
      if (isNaN(nombrePersonnesInt) || nombrePersonnesInt < 1) {
        res.status(400).json({ message: "Nombre de personnes invalide" });
        return;
      }
    }

    let budgetFloat: number | undefined;
    if (budget !== undefined && budget !== null && budget !== "") {
      budgetFloat = parseFloat(budget);
      if (isNaN(budgetFloat) || budgetFloat < 0) {
        res.status(400).json({ message: "Budget invalide" });
        return;
      }
    }

    // Le prestataire doit exister et être actif
    const prestataire = await prisma.prestataire.findUnique({
      where: { id: prestataireId },
      select: { id: true, userId: true, actif: true },
    });
    if (!prestataire || !prestataire.actif) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    // Un prestataire ne peut pas réserver ses propres services
    if (prestataire.userId === req.user!.id) {
      res.status(400).json({ message: "Vous ne pouvez pas réserver vos propres services" });
      return;
    }

    // Vérification de disponibilité : date bloquée par le prestataire
    // ou déjà prise par une réservation confirmée
    if (await dateEstPrise(prestataireId, date)) {
      res.status(400).json({
        message:
          "Ce prestataire n'est pas disponible à cette date. Choisissez une autre date ou contactez-le par message.",
      });
      return;
    }

    const reservation = await prisma.reservation.create({
      data: {
        clientId: req.user!.id,
        prestataireId,
        dateEvenement: date,
        lieuEvenement,
        typeEvenement,
        nombrePersonnes: nombrePersonnesInt,
        message: message || undefined,
        budget: budgetFloat,
      },
      include: {
        prestataire: { select: { nomEntreprise: true } },
        client: { select: { nom: true, prenom: true } },
      },
    });

    // Notification temps réel au prestataire (fire-and-forget : un échec
    // de notification ne doit pas faire échouer la réservation)
    sendNotification(
      prestataire.userId,
      "RESERVATION",
      "Nouvelle demande de réservation",
      `${reservation.client.prenom} ${reservation.client.nom} — ${typeEvenement} le ${date.toLocaleDateString("fr-FR")} à ${lieuEvenement}`,
      { reservationId: reservation.id }
    );

    res.status(201).json(reservation);
  } catch (error) {
    console.error("Erreur création réservation:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const getMesReservations = async (req: AuthRequest, res: Response) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { clientId: req.user!.id },
      include: {
        prestataire: {
          select: { nomEntreprise: true, photos: true, quartier: true },
        },
        // Permet au client de savoir s'il a déjà laissé un avis
        avis: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(reservations);
  } catch (error) {
    console.error("Erreur mes réservations:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Annulation par le CLIENT de sa propre demande
export const annulerReservation = async (req: AuthRequest, res: Response) => {
  try {
    const reservationId = req.params.id as string;

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { prestataire: { select: { userId: true } } },
    });

    if (!reservation) {
      res.status(404).json({ message: "Réservation non trouvée" });
      return;
    }

    if (reservation.clientId !== req.user!.id) {
      res.status(403).json({ message: "Cette réservation ne vous appartient pas" });
      return;
    }

    if (reservation.statut === "TERMINEE") {
      res.status(400).json({ message: "Impossible d'annuler une prestation terminée" });
      return;
    }
    if (reservation.statut === "ANNULEE") {
      res.status(400).json({ message: "Cette réservation est déjà annulée" });
      return;
    }

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { statut: "ANNULEE" },
      include: { prestataire: { select: { nomEntreprise: true } } },
    });

    // Prévenir le prestataire de l'annulation
    sendNotification(
      reservation.prestataire.userId,
      "RESERVATION",
      "Réservation annulée",
      `Le client a annulé la demande de ${reservation.typeEvenement} du ${reservation.dateEvenement.toLocaleDateString("fr-FR")}`,
      { reservationId: reservation.id }
    );

    res.json({ message: "Réservation annulée", reservation: updated });
  } catch (error) {
    console.error("Erreur annulation réservation:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Changement de statut par le PRESTATAIRE (accepter / refuser / terminer)
export const updateStatutReservation = async (req: AuthRequest, res: Response) => {
  try {
    const reservationId = req.params.id as string;
    const { statut } = req.body;

    if (!STATUTS_VALIDES.includes(statut)) {
      res.status(400).json({
        message: `Statut invalide. Valeurs acceptées : ${STATUTS_VALIDES.join(", ")}`,
      });
      return;
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { prestataire: { select: { userId: true } } },
    });

    if (!reservation) {
      res.status(404).json({ message: "Réservation non trouvée" });
      return;
    }

    // Seul le prestataire propriétaire de cette réservation peut en changer le statut.
    // Le client qui a fait la demande ne peut pas s'auto-confirmer, et un tiers non plus.
    const estLePrestataireConcerne = reservation.prestataire.userId === req.user!.id;
    if (!estLePrestataireConcerne) {
      res.status(403).json({ message: "Non autorisé à modifier cette réservation" });
      return;
    }

    // Transitions contrôlées : impossible de "dé-terminer" ou de confirmer une annulation
    const transitionsPossibles = TRANSITIONS_PRESTATAIRE[reservation.statut] || [];
    if (!transitionsPossibles.includes(statut)) {
      res.status(400).json({
        message: `Impossible de passer de ${reservation.statut} à ${statut}`,
      });
      return;
    }

    // ANTI DOUBLE-BOOKING : au moment de CONFIRMER, on re-vérifie que la date
    // n'a pas été prise entre-temps (autre réservation confirmée le même jour,
    // ou date bloquée manuellement par le prestataire après la demande).
    if (statut === "CONFIRMEE") {
      const prise = await dateEstPrise(
        reservation.prestataireId,
        reservation.dateEvenement,
        reservation.id
      );
      if (prise) {
        res.status(400).json({
          message:
            "Cette date n'est plus disponible : une autre réservation confirmée ou une indisponibilité existe déjà ce jour-là.",
        });
        return;
      }
    }

    const statutPrecedent = reservation.statut;

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { statut },
      include: { prestataire: { select: { nomEntreprise: true } } },
    });

    // Prévenir le client du changement de statut.
    // Le message d'annulation dépend du statut précédent : une demande EN_ATTENTE
    // est "déclinée", une réservation CONFIRMEE est "annulée par le prestataire".
    const dateFr = updated.dateEvenement.toLocaleDateString("fr-FR");
    const messagesStatut: Record<string, { titre: string; texte: string }> = {
      CONFIRMEE: {
        titre: "Réservation confirmée ✅",
        texte: `${updated.prestataire.nomEntreprise} a accepté votre demande de ${updated.typeEvenement} du ${dateFr}`,
      },
      ANNULEE:
        statutPrecedent === "CONFIRMEE"
          ? {
              titre: "Réservation annulée par le prestataire",
              texte: `${updated.prestataire.nomEntreprise} a dû annuler votre ${updated.typeEvenement} confirmé du ${dateFr}. Contactez-le par message pour plus de détails.`,
            }
          : {
              titre: "Réservation refusée",
              texte: `${updated.prestataire.nomEntreprise} a décliné votre demande de ${updated.typeEvenement} du ${dateFr}`,
            },
      TERMINEE: {
        titre: "Prestation terminée 🎉",
        texte: `Votre ${updated.typeEvenement} avec ${updated.prestataire.nomEntreprise} est marqué terminé. Vous pouvez maintenant laisser un avis !`,
      },
    };
    const notif = messagesStatut[statut];
    if (notif) {
      sendNotification(updated.clientId, "RESERVATION", notif.titre, notif.texte, {
        reservationId: updated.id,
      });
    }

    res.json(updated);
  } catch (error) {
    console.error("Erreur update statut réservation:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};