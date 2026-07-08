// backend/src/routes/disponibilite.routes.ts
import { Router } from "express";
import {
  getDisponibilitesPubliques,
  getMesIndisponibilites,
  bloquerDate,
  debloquerDate,
} from "../controllers/disponibilite.controller";
import { protect } from "../middlewares/auth.middleware";
import { requireProvider } from "../middlewares/provider.middleware";

const router = Router();

// Routes prestataire (déclarées avant la route publique paramétrée)
router.get("/me", protect, requireProvider, getMesIndisponibilites);
router.post("/", protect, requireProvider, bloquerDate);
router.delete("/:date", protect, requireProvider, debloquerDate);

// Route publique : dates indisponibles d'un prestataire (pour la fiche détail)
router.get("/prestataire/:prestataireId", getDisponibilitesPubliques);

export default router;