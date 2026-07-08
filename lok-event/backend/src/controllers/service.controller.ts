// backend/src/controllers/service.controller.ts
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

const UNITES_VALIDES = ["forfait", "par personne", "par heure", "par jour"];
const MAX_SERVICES = 20;

async function getPrestataireDuUser(userId: string) {
  return prisma.prestataire.findUnique({
    where: { userId },
    select: { id: true },
  });
}

// PRESTATAIRE — liste de ses propres services (actifs et inactifs)
export const getMesServices = async (req: Request, res: Response) => {
  try {
    const prestataire = await getPrestataireDuUser(req.user!.id);
    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const services = await prisma.service.findMany({
      where: { prestataireId: prestataire.id },
      orderBy: { prix: "asc" },
    });

    res.json(services);
  } catch (error) {
    console.error("Erreur mes services:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// PRESTATAIRE — créer un service
export const createService = async (req: Request, res: Response) => {
  try {
    const { nom, description, prix, unite } = req.body;

    if (!nom || !nom.trim()) {
      res.status(400).json({ message: "Le nom de la prestation est requis" });
      return;
    }
    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum <= 0) {
      res.status(400).json({ message: "Le prix doit être un nombre positif" });
      return;
    }
    if (prixNum > 1_000_000_000) {
      res.status(400).json({ message: "Prix invraisemblable, vérifiez le montant" });
      return;
    }
    if (unite && !UNITES_VALIDES.includes(unite)) {
      res.status(400).json({
        message: `Unité invalide. Valeurs acceptées : ${UNITES_VALIDES.join(", ")}`,
      });
      return;
    }

    const prestataire = await getPrestataireDuUser(req.user!.id);
    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const nbServices = await prisma.service.count({
      where: { prestataireId: prestataire.id },
    });
    if (nbServices >= MAX_SERVICES) {
      res.status(400).json({
        message: `Maximum ${MAX_SERVICES} prestations. Supprimez-en une avant d'en ajouter.`,
      });
      return;
    }

    const service = await prisma.service.create({
      data: {
        prestataireId: prestataire.id,
        nom: nom.trim(),
        description: description?.trim() || undefined,
        prix: prixNum,
        unite: unite || undefined,
      },
    });

    res.status(201).json(service);
  } catch (error) {
    console.error("Erreur création service:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// PRESTATAIRE — modifier un service (le sien uniquement)
export const updateService = async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.id as string;
    const { nom, description, prix, unite, actif } = req.body;

    const prestataire = await getPrestataireDuUser(req.user!.id);
    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, prestataireId: prestataire.id },
    });
    if (!service) {
      res.status(404).json({ message: "Prestation non trouvée" });
      return;
    }

    let prixNum: number | undefined;
    if (prix !== undefined) {
      prixNum = parseFloat(prix);
      if (isNaN(prixNum) || prixNum <= 0) {
        res.status(400).json({ message: "Le prix doit être un nombre positif" });
        return;
      }
    }
    if (unite && !UNITES_VALIDES.includes(unite)) {
      res.status(400).json({
        message: `Unité invalide. Valeurs acceptées : ${UNITES_VALIDES.join(", ")}`,
      });
      return;
    }

    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: {
        nom: nom?.trim() || undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
        prix: prixNum,
        unite: unite || undefined,
        actif: typeof actif === "boolean" ? actif : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Erreur modification service:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// PRESTATAIRE — supprimer un service (le sien uniquement)
export const deleteService = async (req: Request, res: Response) => {
  try {
    const serviceId = req.params.id as string;

    const prestataire = await getPrestataireDuUser(req.user!.id);
    if (!prestataire) {
      res.status(404).json({ message: "Prestataire non trouvé" });
      return;
    }

    const supprime = await prisma.service.deleteMany({
      where: { id: serviceId, prestataireId: prestataire.id },
    });

    if (supprime.count === 0) {
      res.status(404).json({ message: "Prestation non trouvée" });
      return;
    }

    res.json({ message: "Prestation supprimée" });
  } catch (error) {
    console.error("Erreur suppression service:", error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};