"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/prestataire.routes.ts
const express_1 = require("express");
const prestataire_controller_1 = require("../controllers/prestataire.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const provider_middleware_1 = require("../middlewares/provider.middleware");
const prestataire_controller_2 = require("../controllers/prestataire.controller");
const visibilite_middleware_1 = require("../middlewares/visibilite.middleware");
const router = (0, express_1.Router)();
// Routes protégées (prestataire connecté UNIQUEMENT — protect + requireProvider)
router.post("/profile", auth_middleware_1.protect, provider_middleware_1.requireProvider, prestataire_controller_1.createPrestataireProfile);
router.get("/dashboard", auth_middleware_1.protect, provider_middleware_1.requireProvider, prestataire_controller_1.getPrestataireDashboard);
router.get("/stats", auth_middleware_1.protect, provider_middleware_1.requireProvider, prestataire_controller_1.getPrestataireStats);
router.get("/profile", auth_middleware_1.protect, provider_middleware_1.requireProvider, prestataire_controller_1.getPrestataireProfile);
router.put("/profile", auth_middleware_1.protect, provider_middleware_1.requireProvider, prestataire_controller_1.updatePrestataireProfile);
router.post("/photos", auth_middleware_1.protect, provider_middleware_1.requireProvider, prestataire_controller_1.addPrestatairePhoto);
router.delete("/photos", auth_middleware_1.protect, provider_middleware_1.requireProvider, prestataire_controller_1.removePrestatairePhoto);
router.get("/bookings", auth_middleware_1.protect, provider_middleware_1.requireProvider, prestataire_controller_1.getPrestataireBookings);
router.put("/bookings/:bookingId/status", auth_middleware_1.protect, provider_middleware_1.requireProvider, prestataire_controller_1.updateBookingStatus);
router.get("/reviews", auth_middleware_1.protect, provider_middleware_1.requireProvider, prestataire_controller_1.getPrestataireReviews);
router.get("/analytics", auth_middleware_1.protect, provider_middleware_1.requireProvider, prestataire_controller_1.getPrestataireAnalytics);
router.post("/photos/upload", auth_middleware_1.protect, provider_middleware_1.requireProvider, prestataire_controller_2.uploadMiddleware.single("image"), prestataire_controller_2.uploadPhotoToImgbb);
// Routes publiques (doivent être déclarées après les routes protégées ci-dessus)
// ⚠️ /proximite DOIT être avant /:id, sinon "proximite" serait interprété comme un id
// masquerNonPremium : seuls les prestataires Premium sont visibles en entier
router.get("/proximite", visibilite_middleware_1.masquerNonPremium, prestataire_controller_1.getPrestatairesProximite);
router.get("/", visibilite_middleware_1.masquerNonPremium, prestataire_controller_1.getPrestatairesPublic);
router.get("/:id", visibilite_middleware_1.masquerNonPremium, prestataire_controller_1.getPrestatairePublic);
exports.default = router;
//# sourceMappingURL=prestataire.routes.js.map