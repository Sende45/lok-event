import { Response } from "express";
import { prisma } from "../lib/prisma";

export const getMesFavoris = async (req: any, res: Response) => {
  try {
    const favoris = await prisma.favori.findMany({
      where: { clientId: req.user.id },
      include: {
        prestataire: {
          include: { categorie: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(favoris);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const addFavori = async (req: any, res: Response) => {
  try {
    const { prestataireId } = req.body;

    const existant = await prisma.favori.findUnique({
      where: {
        clientId_prestataireId: {
          clientId: req.user.id,
          prestataireId,
        },
      },
    });

    if (existant) {
      res.status(400).json({ message: "Déjà dans vos favoris" });
      return;
    }

    const favori = await prisma.favori.create({
      data: { clientId: req.user.id, prestataireId },
      include: { prestataire: { include: { categorie: true } } },
    });

    res.status(201).json(favori);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const removeFavori = async (req: any, res: Response) => {
  try {
    const prestataireId = req.params.prestataireId as string;

    await prisma.favori.delete({
      where: {
        clientId_prestataireId: {
          clientId: req.user.id,
          prestataireId,
        },
      },
    });

    res.json({ message: "Retiré des favoris" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};