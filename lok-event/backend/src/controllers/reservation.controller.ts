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
    const { statut } = req.body;
    const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!reservation) {
      res.status(404).json({ message: "Réservation non trouvée" });
      return;
    }
    const updated = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { statut },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};