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

// ⚠️ Adapte cet import au nom réel de ton middleware d'authentification
// (celui que tu utilises déjà sur /reservations, /avis, etc.)
import { authenticate } from "../middlewares/auth";

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────────
router.get("/packs", getPacks);

// ── Utilisateur connecté (CLIENT ou PRESTATAIRE) ────────────────────────────
router.get("/statut", authMiddleware, getMonStatut);
router.post("/souscrire", authMiddleware, souscrire);
// ...
router.get("/statut", authenticate, getMonStatut);
router.post("/souscrire", authenticate, souscrire);

// ── ADMIN (le contrôle du rôle est fait dans le contrôleur) ─────────────────
router.get("/demandes", authMiddleware, getDemandes);
router.patch("/demandes/:id/valider", authMiddleware, validerDemande);
router.patch("/demandes/:id/refuser", authMiddleware, refuserDemande);
router.patch("/utilisateurs/:userId/desactiver", authMiddleware, desactiverPremium);
router.post("/annonce", authMiddleware, envoyerAnnoncePremium);


export default router;

// Dans app.ts / server.ts :
// import premiumRoutes from "./routes/premium.routes";
// app.use("/premium", premiumRoutes);