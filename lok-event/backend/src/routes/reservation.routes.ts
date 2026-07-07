// backend/src/routes/reservation.routes.ts
import { Router } from "express";
import {
  creerReservation,
  getMesReservations,
  annulerReservation,
  updateStatutReservation,
} from "../controllers/reservation.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", protect, creerReservation);
router.get("/mes-reservations", protect, getMesReservations);
// Annulation par le client de sa propre demande
router.patch("/:id/annuler", protect, annulerReservation);
// Changement de statut par le prestataire (accepter / refuser / terminer)
router.patch("/:id/statut", protect, updateStatutReservation);

export default router;