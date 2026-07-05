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
  getPrestatairePublic,
} from "../controllers/prestataire.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

// Routes protégées (prestataire connecté)
router.post("/profile", protect, createPrestataireProfile);
router.get("/dashboard", protect, getPrestataireDashboard);
router.get("/stats", protect, getPrestataireStats);
router.get("/profile", protect, getPrestataireProfile);
router.put("/profile", protect, updatePrestataireProfile);
router.post("/photos", protect, addPrestatairePhoto);
router.delete("/photos", protect, removePrestatairePhoto);
router.get("/bookings", protect, getPrestataireBookings);
router.put("/bookings/:bookingId/status", protect, updateBookingStatus);
router.get("/reviews", protect, getPrestataireReviews);
router.get("/analytics", protect, getPrestataireAnalytics);

// Routes publiques (doivent être déclarées après les routes protégées ci-dessus)
router.get("/", getPrestatairesPublic);
router.get("/:id", getPrestatairePublic);

export default router;