import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const creerAvis = async (req: any, res: Response) => {
  try {
    const { prestataireId, note, commentaire, reservationId } = req.body;

    if (typeof note !== "number" || !Number.isInteger(note) || note < 1 || note > 5) {
      res.status(400).json({ message: "La note doit être un entier entre 1 et 5" });
      return;
    }

    if (!reservationId) {
      res.status(400).json({ message: "Un avis doit être rattaché à une réservation" });
      return;
    }

    // Vérifie que la réservation existe, qu'elle appartient bien à l'auteur,
    // qu'elle concerne bien ce prestataire, et qu'elle est terminée.
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { avis: true },
    });

    if (!reservation) {
      res.status(404).json({ message: "Réservation introuvable" });
      return;
    }

    if (reservation.clientId !== req.user.id) {
      res.status(403).json({ message: "Cette réservation ne vous appartient pas" });
      return;
    }

    if (reservation.prestataireId !== prestataireId) {
      res.status(400).json({ message: "Cette réservation ne concerne pas ce prestataire" });
      return;
    }

    if (reservation.statut !== "TERMINEE") {
      res.status(400).json({ message: "Vous ne pouvez laisser un avis qu'après une prestation terminée" });
      return;
    }

    if (reservation.avis) {
      res.status(400).json({ message: "Un avis a déjà été laissé pour cette réservation" });
      return;
    }

    const avis = await prisma.avis.create({
      data: { auteurId: req.user.id, prestataireId, note, commentaire, reservationId },
    });

    const stats = await prisma.avis.aggregate({
      where: { prestataireId },
      _avg: { note: true },
      _count: { note: true },
    });
    await prisma.prestataire.update({
      where: { id: prestataireId },
      data: {
        notemoyenne: Math.round((stats._avg.note || 0) * 10) / 10,
        totalAvis: stats._count.note,
      },
    });

    res.status(201).json(avis);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const getAvisPrestataire = async (req: Request, res: Response) => {
  try {
    const avis = await prisma.avis.findMany({
      where: { prestataireId: req.params.id as string },
      include: { auteur: { select: { nom: true, prenom: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(avis);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};