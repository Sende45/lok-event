import { Router } from "express";
import { protect } from "../middlewares/auth.middleware";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "../controllers/notification.controller";

const router = Router();

// ── Lecture ──────────────────────────────────────────────────────────────
// Liste (+ unreadCount + pagination dans la réponse)
router.get("/", protect, getNotifications);
// Compteur léger pour le badge (polling du hook useNotifications)
// ⚠️ déclaré AVANT toute route paramétrée pour ne pas être avalé par /:id
router.get("/unread-count", protect, getUnreadCount);

// ── Marquer comme lu ─────────────────────────────────────────────────────
// Nouvelles routes (utilisées par useNotifications) — PATCH
// ⚠️ /read-all AVANT /:id/read, sinon Express prend "read-all" pour un id
router.patch("/read-all", protect, markAllAsRead);
router.patch("/:id/read", protect, markAsRead);

// Anciennes routes conservées (compatibilité avec l'ancien front) — PUT
router.put("/mark-all", protect, markAllAsRead);
router.put("/:id/read", protect, markAsRead);

// ── Suppression ──────────────────────────────────────────────────────────
// Une notification (la sienne uniquement — vérifié dans le contrôleur)
router.delete("/:id", protect, deleteNotification);
// Tout vider (option ?luesSeulement=true pour ne supprimer que les lues)
router.delete("/", protect, deleteAllNotifications);

export default router;