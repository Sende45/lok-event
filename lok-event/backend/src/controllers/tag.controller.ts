import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

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
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const createTag = async (req: Request, res: Response) => {
  try {
    const { nom, slug, groupe, icone } = req.body;
    const tag = await prisma.tag.create({
      data: { nom, slug, groupe, icone },
    });
    res.status(201).json(tag);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const updateTag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { nom, slug, groupe, icone } = req.body;
    const tag = await prisma.tag.update({
      where: { id },
      data: { nom, slug, groupe, icone },
    });
    res.json(tag);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

export const deleteTag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.tag.delete({ where: { id } });
    res.json({ message: "Tag supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};