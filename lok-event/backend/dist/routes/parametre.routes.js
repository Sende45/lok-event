"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/parametre.routes.ts
const express_1 = require("express");
const parametre_controller_1 = require("../controllers/parametre.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Lecture publique (la page /premium affiche le numéro selon l'opérateur choisi)
router.get("/paiement", parametre_controller_1.getParametresPaiement);
// Modification réservée ADMIN (contrôle du rôle dans le contrôleur)
router.put("/paiement", auth_middleware_1.protect, parametre_controller_1.updateParametresPaiement);
exports.default = router;
// Dans app.ts / server.ts, avec le même préfixe que tes autres routes :
// import parametreRoutes from "./routes/parametre.routes";
// app.use("/parametres", parametreRoutes);   // ou "/api/parametres" selon ton préfixe
//# sourceMappingURL=parametre.routes.js.map