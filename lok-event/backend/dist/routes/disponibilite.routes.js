"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/disponibilite.routes.ts
const express_1 = require("express");
const disponibilite_controller_1 = require("../controllers/disponibilite.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const provider_middleware_1 = require("../middlewares/provider.middleware");
const router = (0, express_1.Router)();
// Routes prestataire (déclarées avant la route publique paramétrée)
router.get("/me", auth_middleware_1.protect, provider_middleware_1.requireProvider, disponibilite_controller_1.getMesIndisponibilites);
router.post("/", auth_middleware_1.protect, provider_middleware_1.requireProvider, disponibilite_controller_1.bloquerDate);
router.delete("/:date", auth_middleware_1.protect, provider_middleware_1.requireProvider, disponibilite_controller_1.debloquerDate);
// Route publique : dates indisponibles d'un prestataire (pour la fiche détail)
router.get("/prestataire/:prestataireId", disponibilite_controller_1.getDisponibilitesPubliques);
exports.default = router;
//# sourceMappingURL=disponibilite.routes.js.map