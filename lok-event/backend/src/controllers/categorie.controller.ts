import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// Validation commune création/modification
function validerChamps(body: {
  nom?: unknown;
  slug?: unknown;
}): string | null {
  const { nom, slug } = body;
  if (typeof nom !== "string" || !nom.trim()) return "Le nom est requis";
  if (typeof slug !== "string" || !slug.trim()) return "Le slug est requis";
  if (nom.trim().length > 60) return "Nom trop long (60 caractères max)";
  // Slug propre : minuscules, chiffres et tirets uniquement (utilisé dans les URLs)
  if (!/^[a-z0-9-]+$/.test(slug.trim()))
    return "Slug invalide : minuscules, chiffres et tirets uniquement (ex: dj-animation)";
  return null;
}

// Prisma P2002 = violation de contrainte unique (slug ou nom en doublon)
function estDoublonPrisma(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.categorie.findMany({
      include: { _count: { select: { prestataires: true } } },
      orderBy: { nom: "asc" },
    });
    res.json(categories);
  } catch (error) {
    console.error("Erreur liste catégories:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const createCategorie = async (req: Request, res: Response) => {
  try {
    const erreur = validerChamps(req.body);
    if (erreur) {
      res.status(400).json({ message: erreur });
      return;
    }

    const { nom, slug, description, icone, couleur } = req.body;
    const categorie = await prisma.categorie.create({
      data: {
        nom: nom.trim(),
        slug: slug.trim(),
        description: description?.trim() || undefined,
        icone,
        couleur,
      },
    });
    res.status(201).json(categorie);
  } catch (error) {
    if (estDoublonPrisma(error)) {
      res.status(400).json({ message: "Une catégorie avec ce nom ou ce slug existe déjà" });
      return;
    }
    console.error("Erreur création catégorie:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const updateCategorie = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const erreur = validerChamps(req.body);
    if (erreur) {
      res.status(400).json({ message: erreur });
      return;
    }

    const { nom, slug, description, icone, couleur } = req.body;
    const categorie = await prisma.categorie.update({
      where: { id },
      data: {
        nom: nom.trim(),
        slug: slug.trim(),
        description: description?.trim() || undefined,
        icone,
        couleur,
      },
    });
    res.json(categorie);
  } catch (error) {
    if (estDoublonPrisma(error)) {
      res.status(400).json({ message: "Une catégorie avec ce nom ou ce slug existe déjà" });
      return;
    }
    console.error("Erreur modification catégorie:", error);
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
    console.error("Erreur suppression catégorie:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};