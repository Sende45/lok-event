"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const categorie_controller_1 = require("../controllers/categorie.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get("/", categorie_controller_1.getCategories);
router.post("/", auth_middleware_1.protect, auth_middleware_1.adminOnly, categorie_controller_1.createCategorie);
router.put("/:id", auth_middleware_1.protect, auth_middleware_1.adminOnly, categorie_controller_1.updateCategorie);
router.delete("/:id", auth_middleware_1.protect, auth_middleware_1.adminOnly, categorie_controller_1.deleteCategorie);
exports.default = router;
//# sourceMappingURL=categorie.routes.js.map