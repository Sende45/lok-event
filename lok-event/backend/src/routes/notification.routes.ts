import { Router } from "express";
import { protect } from "../middlewares/auth.middleware";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification.controller";

const router = Router();

// On garde exactement la structure que tu veux (rien changé dans les routes)
router.get("/", protect, getNotifications);
router.put("/mark-all", protect, markAllAsRead);
router.put("/:id/read", protect, markAsRead);

export default router;