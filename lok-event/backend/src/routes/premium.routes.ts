// backend/src/routes/premium.routes.ts
import { Router } from "express";
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
import { protect } from "../middlewares/auth.middleware";

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────────
router.get("/packs", getPacks);

// ── Utilisateur connecté (CLIENT ou PRESTATAIRE) ────────────────────────────
router.get("/statut", protect, getMonStatut);
router.post("/souscrire", protect, souscrire);

// ── ADMIN (le contrôle du rôle est fait dans le contrôleur) ─────────────────
router.get("/demandes", protect, getDemandes);
router.patch("/demandes/:id/valider", protect, validerDemande);
router.patch("/demandes/:id/refuser", protect, refuserDemande);
router.patch("/utilisateurs/:userId/desactiver", protect, desactiverPremium);
router.post("/annonce", protect, envoyerAnnoncePremium);

export default router;