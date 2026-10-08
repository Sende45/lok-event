"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/message.routes.ts
const express_1 = require("express");
const message_controller_1 = require("../controllers/message.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const prestataireVisible_middleware_1 = require("../middlewares/prestataireVisible.middleware");
const router = (0, express_1.Router)();
// exigerPrestataireVisible : pas de nouvelle conversation avec une fiche masquée (non Premium)
router.post("/", auth_middleware_1.protect, prestataireVisible_middleware_1.exigerPrestataireVisible, message_controller_1.getOrCreateConversation);
router.get("/", auth_middleware_1.protect, message_controller_1.getMesConversations);
router.get("/unread-count", auth_middleware_1.protect, message_controller_1.getUnreadMessagesCount);
router.get("/:id/messages", auth_middleware_1.protect, message_controller_1.getMessages);
router.post("/:id/messages", auth_middleware_1.protect, message_controller_1.sendMessage);
exports.default = router;
//# sourceMappingURL=message.routes.js.map