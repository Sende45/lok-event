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

const router = Router();

router.post("/", protect, getOrCreateConversation);
router.get("/", protect, getMesConversations);
router.get("/unread-count", protect, getUnreadMessagesCount);
router.get("/:id/messages", protect, getMessages);
router.post("/:id/messages", protect, sendMessage);

export default router;