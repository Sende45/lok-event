import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// Validation commune création/modification
function validerChamps(body: {
  nom?: unknown;
  slug?: unknown;
  groupe?: unknown;
}): string | null {
  const { nom, slug, groupe } = body;
  if (typeof nom !== "string" || !nom.trim()) return "Le nom est requis";
  if (typeof slug !== "string" || !slug.trim()) return "Le slug est requis";
  if (typeof groupe !== "string" || !groupe.trim()) return "Le groupe est requis";
  if (nom.trim().length > 60) return "Nom trop long (60 caractères max)";
  // Slug propre : minuscules, chiffres et tirets uniquement (utilisé dans les URLs)
  if (!/^[a-z0-9-]+$/.test(slug.trim()))
    return "Slug invalide : minuscules, chiffres et tirets uniquement (ex: mariage-traditionnel)";
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

export const getTags = async (_req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { nom: "asc" },
    });

    const grouped = tags.reduce((acc: Record<string, typeof tags>, tag) => {
      if (!acc[tag.groupe]) acc[tag.groupe] = [];
      acc[tag.groupe].push(tag);
      return acc;
    }, {});

    res.json(grouped);
  } catch (error) {
    console.error("Erreur liste tags:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const createTag = async (req: Request, res: Response) => {
  try {
    const erreur = validerChamps(req.body);
    if (erreur) {
      res.status(400).json({ message: erreur });
      return;
    }

    const { nom, slug, groupe, icone } = req.body;
    const tag = await prisma.tag.create({
      data: { nom: nom.trim(), slug: slug.trim(), groupe: groupe.trim(), icone },
    });
    res.status(201).json(tag);
  } catch (error) {
    if (estDoublonPrisma(error)) {
      res.status(400).json({ message: "Un tag avec ce nom ou ce slug existe déjà" });
      return;
    }
    console.error("Erreur création tag:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const updateTag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const erreur = validerChamps(req.body);
    if (erreur) {
      res.status(400).json({ message: erreur });
      return;
    }

    const { nom, slug, groupe, icone } = req.body;
    const tag = await prisma.tag.update({
      where: { id },
      data: { nom: nom.trim(), slug: slug.trim(), groupe: groupe.trim(), icone },
    });
    res.json(tag);
  } catch (error) {
    if (estDoublonPrisma(error)) {
      res.status(400).json({ message: "Un tag avec ce nom ou ce slug existe déjà" });
      return;
    }
    console.error("Erreur modification tag:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const deleteTag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    // Même garde-fou que pour les catégories : on ne supprime pas un tag
    // encore lié à des prestataires (sinon erreur de contrainte ou données orphelines)
    const enUsage = await prisma.prestataire.count({
      where: { tags: { some: { id } } },
    });
    if (enUsage > 0) {
      res.status(400).json({
        message: `Impossible de supprimer : ${enUsage} prestataire(s) utilisent ce tag. Retirez-le de leurs profils d'abord.`,
      });
      return;
    }

    await prisma.tag.delete({ where: { id } });
    res.json({ message: "Tag supprimé" });
  } catch (error) {
    console.error("Erreur suppression tag:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};