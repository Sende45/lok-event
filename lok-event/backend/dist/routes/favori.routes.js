"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const favori_controller_1 = require("../controllers/favori.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.protect, favori_controller_1.getMesFavoris);
router.post("/", auth_middleware_1.protect, favori_controller_1.addFavori);
router.delete("/:prestataireId", auth_middleware_1.protect, favori_controller_1.removeFavori);
exports.default = router;
//# sourceMappingURL=favori.routes.js.map