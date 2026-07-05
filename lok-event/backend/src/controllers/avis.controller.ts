import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const creerAvis = async (req: any, res: Response) => {
  try {
    const { prestataireId, note, commentaire, reservationId } = req.body;
    if (note < 1 || note > 5) {
      res.status(400).json({ message: "La note doit être entre 1 et 5" });
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