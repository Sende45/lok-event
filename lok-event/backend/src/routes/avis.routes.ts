import { Router } from "express";
import { creerAvis, getAvisPrestataire } from "../controllers/avis.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();
router.post("/", protect, creerAvis);
router.get("/:id", getAvisPrestataire);
export default router;