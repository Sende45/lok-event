"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/reservation.routes.ts
const express_1 = require("express");
const reservation_controller_1 = require("../controllers/reservation.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const prestataireVisible_middleware_1 = require("../middlewares/prestataireVisible.middleware");
const router = (0, express_1.Router)();
// exigerPrestataireVisible : pas de réservation vers une fiche masquée (non Premium)
router.post("/", auth_middleware_1.protect, prestataireVisible_middleware_1.exigerPrestataireVisible, reservation_controller_1.creerReservation);
router.get("/mes-reservations", auth_middleware_1.protect, reservation_controller_1.getMesReservations);
// Annulation par le client de sa propre demande
router.patch("/:id/annuler", auth_middleware_1.protect, reservation_controller_1.annulerReservation);
// Changement de statut par le prestataire (accepter / refuser / terminer)
router.patch("/:id/statut", auth_middleware_1.protect, reservation_controller_1.updateStatutReservation);
exports.default = router;
//# sourceMappingURL=reservation.routes.js.map