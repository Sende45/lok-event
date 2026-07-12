// backend/src/routes/premium.routes.ts
//
// Version AUTONOME : le middleware d'authentification est défini ici même,
// donc aucune dépendance vers ../middleware/... qui fait échouer le build.
// Il fait exactement ce que fait ton middleware existant : vérifier le JWT
// Bearer, puis attacher req.user = { id, email, role }.
// (Le rôle est rechargé depuis la base : impossible de tricher avec un vieux
// token, et une suppression de compte coupe l'accès immédiatement.)
//
// Dans app.ts / server.ts :
//   import premiumRoutes from "./routes/premium.routes";
//   app.use("/premium", premiumRoutes);

import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import {
  getPacks,
  getMonStatut,
  souscrire,
  getDemandes,
  validerDemande,
  refuserDemande,
  desactiverPremium,
  envoyerAnnoncePremium,
} from "../controllers/premium.controller";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface JwtPayload {
  id?: string;
  userId?: string;
  email?: string;
  role?: string;
}

// ── Middleware d'authentification local ─────────────────────────────────────
async function authPremium(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      res.status(401).json({ message: "Authentification requise" });
      return;
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    const userId = payload.id || payload.userId;
    if (!userId) {
      res.status(401).json({ message: "Token invalide" });
      return;
    }

    // Rôle et email rechargés depuis la base (source de vérité)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      res.status(401).json({ message: "Utilisateur introuvable" });
      return;
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch {
    res.status(401).json({ message: "Token invalide ou expiré" });
  }
}

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────────
router.get("/packs", getPacks);

// ── Utilisateur connecté (CLIENT ou PRESTATAIRE) ────────────────────────────
router.get("/statut", authPremium, getMonStatut);
router.post("/souscrire", authPremium, souscrire);

// ── ADMIN (le contrôle du rôle est fait dans le contrôleur) ─────────────────
router.get("/demandes", authPremium, getDemandes);
router.patch("/demandes/:id/valider", authPremium, validerDemande);
router.patch("/demandes/:id/refuser", authPremium, refuserDemande);
router.patch("/utilisateurs/:userId/desactiver", authPremium, desactiverPremium);
router.post("/annonce", authPremium, envoyerAnnoncePremium);

export default router;