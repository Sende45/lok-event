// backend/src/routes/service.routes.ts
import { Router } from "express";
import {
  getMesServices,
  createService,
  updateService,
  deleteService,
} from "../controllers/service.controller";
import { protect } from "../middlewares/auth.middleware";
import { requireProvider } from "../middlewares/provider.middleware";

const router = Router();

router.get("/me", protect, requireProvider, getMesServices);
router.post("/", protect, requireProvider, createService);
router.put("/:id", protect, requireProvider, updateService);
router.delete("/:id", protect, requireProvider, deleteService);

export default router;