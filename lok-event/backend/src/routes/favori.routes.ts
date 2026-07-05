import { Router } from "express";
import { getMesFavoris, addFavori, removeFavori } from "../controllers/favori.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", protect, getMesFavoris);
router.post("/", protect, addFavori);
router.delete("/:prestataireId", protect, removeFavori);

export default router;