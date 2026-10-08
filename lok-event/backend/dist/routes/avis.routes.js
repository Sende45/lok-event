"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const avis_controller_1 = require("../controllers/avis.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.protect, avis_controller_1.creerAvis);
router.get("/:id", avis_controller_1.getAvisPrestataire);
exports.default = router;
//# sourceMappingURL=avis.routes.js.map