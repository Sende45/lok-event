"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const notification_controller_1 = require("../controllers/notification.controller");
const router = (0, express_1.Router)();
// ── Lecture ──────────────────────────────────────────────────────────────
// Liste (+ unreadCount + pagination dans la réponse)
router.get("/", auth_middleware_1.protect, notification_controller_1.getNotifications);
// Compteur léger pour le badge (polling du hook useNotifications)
// ⚠️ déclaré AVANT toute route paramétrée pour ne pas être avalé par /:id
router.get("/unread-count", auth_middleware_1.protect, notification_controller_1.getUnreadCount);
// ── Marquer comme lu ─────────────────────────────────────────────────────
// Nouvelles routes (utilisées par useNotifications) — PATCH
// ⚠️ /read-all AVANT /:id/read, sinon Express prend "read-all" pour un id
router.patch("/read-all", auth_middleware_1.protect, notification_controller_1.markAllAsRead);
router.patch("/:id/read", auth_middleware_1.protect, notification_controller_1.markAsRead);
// Anciennes routes conservées (compatibilité avec l'ancien front) — PUT
router.put("/mark-all", auth_middleware_1.protect, notification_controller_1.markAllAsRead);
router.put("/:id/read", auth_middleware_1.protect, notification_controller_1.markAsRead);
// ── Suppression ──────────────────────────────────────────────────────────
// Une notification (la sienne uniquement — vérifié dans le contrôleur)
router.delete("/:id", auth_middleware_1.protect, notification_controller_1.deleteNotification);
// Tout vider (option ?luesSeulement=true pour ne supprimer que les lues)
router.delete("/", auth_middleware_1.protect, notification_controller_1.deleteAllNotifications);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map