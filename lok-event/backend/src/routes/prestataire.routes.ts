// backend/src/routes/prestataire.routes.ts
import { Router } from "express";
import {
  createPrestataireProfile,
  addPrestatairePhoto,
  removePrestatairePhoto,
  getPrestataireDashboard,
  getPrestataireStats,
  getPrestataireProfile,
  updatePrestataireProfile,
  getPrestataireBookings,
  updateBookingStatus,
  getPrestataireReviews,
  getPrestataireAnalytics,
  getPrestatairesPublic,
  getPrestatairesProximite,
  getPrestatairePublic,
} from "../controllers/prestataire.controller";
import { protect } from "../middlewares/auth.middleware";
import { requireProvider } from "../middlewares/provider.middleware";
import { uploadMiddleware, uploadPhotoToImgbb } from "../controllers/prestataire.controller";
import { masquerNonPremium } from "../middlewares/visibilite.middleware";

const router = Router();

// Routes protégées (prestataire connecté UNIQUEMENT — protect + requireProvider)
router.post("/profile", protect, requireProvider, createPrestataireProfile);
router.get("/dashboard", protect, requireProvider, getPrestataireDashboard);
router.get("/stats", protect, requireProvider, getPrestataireStats);
router.get("/profile", protect, requireProvider, getPrestataireProfile);
router.put("/profile", protect, requireProvider, updatePrestataireProfile);
router.post("/photos", protect, requireProvider, addPrestatairePhoto);
router.delete("/photos", protect, requireProvider, removePrestatairePhoto);
router.get("/bookings", protect, requireProvider, getPrestataireBookings);
router.put("/bookings/:bookingId/status", protect, requireProvider, updateBookingStatus);
router.get("/reviews", protect, requireProvider, getPrestataireReviews);
router.get("/analytics", protect, requireProvider, getPrestataireAnalytics);
router.post("/photos/upload", protect, requireProvider, uploadMiddleware.single("image"), uploadPhotoToImgbb);

// Routes publiques (doivent être déclarées après les routes protégées ci-dessus)
// ⚠️ /proximite DOIT être avant /:id, sinon "proximite" serait interprété comme un id
// masquerNonPremium : seuls les prestataires Premium sont visibles en entier
router.get("/proximite", masquerNonPremium, getPrestatairesProximite);
router.get("/", masquerNonPremium, getPrestatairesPublic);
router.get("/:id", masquerNonPremium, getPrestatairePublic);

export default router;