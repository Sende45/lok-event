import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.categorie.findMany({
      include: { _count: { select: { prestataires: true } } },
      orderBy: { nom: "asc" },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const createCategorie = async (req: Request, res: Response) => {
  try {
    const { nom, slug, description, icone, couleur } = req.body;
    const categorie = await prisma.categorie.create({
      data: { nom, slug, description, icone, couleur },
    });
    res.status(201).json(categorie);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const updateCategorie = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { nom, slug, description, icone, couleur } = req.body;
    const categorie = await prisma.categorie.update({
      where: { id },
      data: { nom, slug, description, icone, couleur },
    });
    res.json(categorie);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const deleteCategorie = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const enUsage = await prisma.prestataire.count({ where: { categorieId: id } });
    if (enUsage > 0) {
      res.status(400).json({
        message: `Impossible de supprimer : ${enUsage} prestataire(s) utilisent cette catégorie`,
      });
      return;
    }
    await prisma.categorie.delete({ where: { id } });
    res.json({ message: "Catégorie supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};