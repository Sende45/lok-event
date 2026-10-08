"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/service.routes.ts
const express_1 = require("express");
const service_controller_1 = require("../controllers/service.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const provider_middleware_1 = require("../middlewares/provider.middleware");
const router = (0, express_1.Router)();
router.get("/me", auth_middleware_1.protect, provider_middleware_1.requireProvider, service_controller_1.getMesServices);
router.post("/", auth_middleware_1.protect, provider_middleware_1.requireProvider, service_controller_1.createService);
router.put("/:id", auth_middleware_1.protect, provider_middleware_1.requireProvider, service_controller_1.updateService);
router.delete("/:id", auth_middleware_1.protect, provider_middleware_1.requireProvider, service_controller_1.deleteService);
exports.default = router;
//# sourceMappingURL=service.routes.js.map