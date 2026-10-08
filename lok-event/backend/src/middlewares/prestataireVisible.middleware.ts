// backend/src/middlewares/prestataireVisible.middleware.ts
//
// Bloque les nouvelles réservations et les nouvelles conversations vers un
// prestataire dont la fiche est masquée (pas d'abonnement Premium actif).
// Les conversations et réservations déjà commencées continuent normalement.
// À placer APRÈS protect, sur les routes qui reçoivent "prestataireId" dans le body.
import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { premiumEstActif } from "../lib/socket";

export const exigerPrestataireVisible = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prestataireId = req.body?.prestataireId;
    // Pas d'id : on laisse le contrôleur renvoyer son propre message d'erreur
    if (!prestataireId || typeof prestataireId !== "string") return next();

    // Les admins ne sont jamais bloqués
    if (req.user?.role === "ADMIN") return next();

    const prestataire = await prisma.prestataire.findUnique({
      where: { id: prestataireId },
      select: { user: { select: { estPremium: true, premiumJusquau: true } } },
    });
    // Prestataire introuvable : le contrôleur renverra son 404
    if (!prestataire) return next();

    if (!premiumEstActif(prestataire.user)) {
      res.status(403).json({
        message: "Ce prestataire n'est pas encore disponible sur LOKEVENT. Découvrez les prestataires visibles.",
      });
      return;
    }
    next();
  } catch (error) {
    console.error("Erreur vérification visibilité prestataire:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};