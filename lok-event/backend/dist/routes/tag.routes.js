"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tag_controller_1 = require("../controllers/tag.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get("/", tag_controller_1.getTags);
router.post("/", auth_middleware_1.protect, auth_middleware_1.adminOnly, tag_controller_1.createTag);
router.put("/:id", auth_middleware_1.protect, auth_middleware_1.adminOnly, tag_controller_1.updateTag);
router.delete("/:id", auth_middleware_1.protect, auth_middleware_1.adminOnly, tag_controller_1.deleteTag);
exports.default = router;
//# sourceMappingURL=tag.routes.js.map