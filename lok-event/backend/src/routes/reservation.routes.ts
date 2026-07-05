import { Router } from "express";
import { creerReservation, getMesReservations, updateStatutReservation } from "../controllers/reservation.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();
router.post("/", protect, creerReservation);
router.get("/mes-reservations", protect, getMesReservations);
router.patch("/:id/statut", protect, updateStatutReservation);
export default router;