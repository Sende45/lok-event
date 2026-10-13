// lok-event/backend/src/routes/moderation.routes.ts — signaler et bloquer
import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  creerSignalement,
  mesBlocages,
  bloquer,
  debloquer,
  listerSignalements,
  traiterSignalement,
} from "../controllers/moderation.controller";
import { protect, adminOnly } from "../middlewares/auth.middleware";

// 20 signalements / heure par IP : suffisant pour un usage normal,
// bloque les abus (signalements en masse pour nuire à un prestataire)
const signalementLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { message: "Trop de signalements envoyés. Réessayez plus tard." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// Utilisateurs connectés
router.post("/signalements", protect, signalementLimiter, creerSignalement);
router.get("/blocages", protect, mesBlocages);
router.post("/blocages", protect, bloquer);
router.delete("/blocages/:utilisateurId", protect, debloquer);

// Admins
router.get("/admin/signalements", protect, adminOnly, listerSignalements);
router.patch("/admin/signalements/:id", protect, adminOnly, traiterSignalement);

export default router;