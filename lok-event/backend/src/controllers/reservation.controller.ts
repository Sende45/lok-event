// backend/src/controllers/reservation.controller.ts
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

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

    const reservation = await prisma.reservation.create({
      data: {
        clientId: req.user!.id,
        prestataireId,
        dateEvenement: date,
        lieuEvenement,
        typeEvenement,
        nombrePersonnes: nombrePersonnes ? parseInt(nombrePersonnes) : undefined,
        message: message || undefined,
        budget: budget ? parseFloat(budget) : undefined,
      },
      include: { prestataire: { select: { nomEntreprise: true } } },
    });
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

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { statut },
    });
    res.json(updated);
  } catch (error) {
    console.error("Erreur update statut réservation:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};