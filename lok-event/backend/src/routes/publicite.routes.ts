// backend/src/routes/publicite.routes.ts
import { Router } from "express";
import {
  getPublicitesActives,
  enregistrerAffichage,
  enregistrerClic,
  listerPublicitesAdmin,
  creerPublicite,
  modifierPublicite,
  supprimerPublicite,
} from "../controllers/publicite.controller";
import { uploadMiddleware, uploadPhotoToImgbb } from "../controllers/prestataire.controller";
import { protect, adminOnly } from "../middlewares/auth.middleware";

const router = Router();

// ── Admin (déclarées AVANT /:id) ─────────────────────────────────────────────
router.get("/admin/toutes", protect, adminOnly, listerPublicitesAdmin);
// Upload de la bannière vers Imgbb (la clé reste cachée côté serveur)
router.post("/upload", protect, adminOnly, uploadMiddleware.single("image"), uploadPhotoToImgbb);
router.post("/", protect, adminOnly, creerPublicite);
router.put("/:id", protect, adminOnly, modifierPublicite);
router.delete("/:id", protect, adminOnly, supprimerPublicite);

// ── Public ───────────────────────────────────────────────────────────────────
router.get("/", getPublicitesActives);
router.post("/:id/affichage", enregistrerAffichage);
router.post("/:id/clic", enregistrerClic);

export default router;