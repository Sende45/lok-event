import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const creerReservation = async (req: any, res: Response) => {
  try {
    const { prestataireId, dateEvenement, lieuEvenement, typeEvenement, nombrePersonnes, message, budget } = req.body;
    const reservation = await prisma.reservation.create({
      data: {
        clientId: req.user.id,
        prestataireId,
        dateEvenement: new Date(dateEvenement),
        lieuEvenement,
        typeEvenement,
        nombrePersonnes,
        message,
        budget,
      },
      include: { prestataire: { select: { nomEntreprise: true } } },
    });
    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const getMesReservations = async (req: any, res: Response) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { clientId: req.user.id },
      include: { prestataire: { select: { nomEntreprise: true, photos: true, quartier: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const updateStatutReservation = async (req: any, res: Response) => {
  try {
    const reservationId = req.params.id as string;
    const { statut } = req.body;

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
    const estLePrestataireConcerne = reservation.prestataire.userId === req.user.id;
    if (!estLePrestataireConcerne) {
      res.status(403).json({ message: "Non autorisé à modifier cette réservation" });
      return;
    }

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { statut },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};