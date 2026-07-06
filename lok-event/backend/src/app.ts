// backend/src/app.ts
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import prestataireRoutes from "./routes/prestataire.routes";
import categorieRoutes from "./routes/categorie.routes";
import reservationRoutes from "./routes/reservation.routes";
import avisRoutes from "./routes/avis.routes";
import adminRoutes from "./routes/admin.routes";
import tagRoutes from "./routes/tag.routes";
import favoriRoutes from "./routes/favori.routes";
import { globalLimiter } from "./middlewares/rateLimit.middleware";

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Le rate-limiter global est désactivé en environnement de test
// pour ne pas fausser les résultats des tests qui font beaucoup de requêtes rapides.
if (process.env.NODE_ENV !== "test") {
  app.use(globalLimiter);
}

app.get("/health", (_req, res) =>
  res.json({ status: "OK", service: "LOKEVENT API" })
);

app.use("/api/auth", authRoutes);
app.use("/api/prestataires", prestataireRoutes);
app.use("/api/categories", categorieRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/avis", avisRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/favoris", favoriRoutes);

export default app;