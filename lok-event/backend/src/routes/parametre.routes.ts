// backend/src/routes/parametre.routes.ts
import { Router } from "express";
import {
  getParametresPaiement,
  updateParametresPaiement,
} from "../controllers/parametre.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

// Lecture publique (la page /premium affiche le numéro selon l'opérateur choisi)
router.get("/paiement", getParametresPaiement);

// Modification réservée ADMIN (contrôle du rôle dans le contrôleur)
router.put("/paiement", protect, updateParametresPaiement);

export default router;

// Dans app.ts / server.ts, avec le même préfixe que tes autres routes :
// import parametreRoutes from "./routes/parametre.routes";
// app.use("/parametres", parametreRoutes);   // ou "/api/parametres" selon ton préfixe