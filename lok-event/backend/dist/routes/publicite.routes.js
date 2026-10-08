"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/publicite.routes.ts
const express_1 = require("express");
const publicite_controller_1 = require("../controllers/publicite.controller");
const prestataire_controller_1 = require("../controllers/prestataire.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// ── Admin (déclarées AVANT /:id) ─────────────────────────────────────────────
router.get("/admin/toutes", auth_middleware_1.protect, auth_middleware_1.adminOnly, publicite_controller_1.listerPublicitesAdmin);
// Upload de la bannière vers Imgbb (la clé reste cachée côté serveur)
router.post("/upload", auth_middleware_1.protect, auth_middleware_1.adminOnly, prestataire_controller_1.uploadMiddleware.single("image"), prestataire_controller_1.uploadPhotoToImgbb);
router.post("/", auth_middleware_1.protect, auth_middleware_1.adminOnly, publicite_controller_1.creerPublicite);
router.put("/:id", auth_middleware_1.protect, auth_middleware_1.adminOnly, publicite_controller_1.modifierPublicite);
router.delete("/:id", auth_middleware_1.protect, auth_middleware_1.adminOnly, publicite_controller_1.supprimerPublicite);
// ── Public ───────────────────────────────────────────────────────────────────
router.get("/", publicite_controller_1.getPublicitesActives);
router.post("/:id/affichage", publicite_controller_1.enregistrerAffichage);
router.post("/:id/clic", publicite_controller_1.enregistrerClic);
exports.default = router;
//# sourceMappingURL=publicite.routes.js.map