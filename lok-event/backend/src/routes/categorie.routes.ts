import { Router } from "express";
import {
  getCategories,
  createCategorie,
  updateCategorie,
  deleteCategorie,
} from "../controllers/categorie.controller";
import { protect, adminOnly } from "../middlewares/auth.middleware";

const router = Router();
router.get("/", getCategories);
router.post("/", protect, adminOnly, createCategorie);
router.put("/:id", protect, adminOnly, updateCategorie);
router.delete("/:id", protect, adminOnly, deleteCategorie);
export default router;