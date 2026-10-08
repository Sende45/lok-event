// backend/src/routes/message.routes.ts
import { Router } from "express";
import {
  getOrCreateConversation,
  getMesConversations,
  getMessages,
  sendMessage,
  getUnreadMessagesCount,
} from "../controllers/message.controller";
import { protect } from "../middlewares/auth.middleware";
import { exigerPrestataireVisible } from "../middlewares/prestataireVisible.middleware";

const router = Router();

// exigerPrestataireVisible : pas de nouvelle conversation avec une fiche masquée (non Premium)
router.post("/", protect, exigerPrestataireVisible, getOrCreateConversation);
router.get("/", protect, getMesConversations);
router.get("/unread-count", protect, getUnreadMessagesCount);
router.get("/:id/messages", protect, getMessages);
router.post("/:id/messages", protect, sendMessage);

export default router;