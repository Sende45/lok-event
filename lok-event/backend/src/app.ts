// backend/src/app.ts
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/auth.routes";
import prestataireRoutes from "./routes/prestataire.routes";
import categorieRoutes from "./routes/categorie.routes";
import reservationRoutes from "./routes/reservation.routes";
import avisRoutes from "./routes/avis.routes";
import adminRoutes from "./routes/admin.routes";
import tagRoutes from "./routes/tag.routes";
import favoriRoutes from "./routes/favori.routes";
import notificationRoutes from "./routes/notification.routes";
import messageRoutes from "./routes/message.routes";
import disponibiliteRoutes from "./routes/disponibilite.routes";
import serviceRoutes from "./routes/service.routes";
import premiumRoutes from "./routes/premium.routes";
import parametreRoutes from "./routes/parametre.routes"
import { globalLimiter } from "./middlewares/rateLimit.middleware";

const app = express();
app.set("trust proxy", 1);

// Active l'extension unaccent si absente (idempotent, sans danger).
// Garantit que la recherche insensible aux accents fonctionne,
// y compris après un changement ou une recréation de base de données.
async function ensureUnaccent() {
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS unaccent`);
    console.log("Extension unaccent OK");
  } catch (err) {
    console.error(
      "Impossible d'activer unaccent (réessaiera au prochain démarrage):",
      err
    );
  }
}
if (process.env.NODE_ENV !== "test") {
  ensureUnaccent();
}

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

// Autorise en plus toute URL de preview Vercel du même projet
// (ex: lok-event-git-feature-xyz-tonequipe.vercel.app),
// en plus des origines fixes ci-dessus.
const vercelPreviewPattern = /^https:\/\/lok-event-[a-z0-9-]+\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        // Requêtes sans origine (ex: Postman, curl, apps mobiles) — autorisées
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Non autorisé par la politique CORS"));
    },
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
app.use("/api/notifications", notificationRoutes);
app.use("/api/conversations", messageRoutes);
app.use("/api/disponibilites", disponibiliteRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/premium", premiumRoutes);
app.use("/api/parametres", parametreRoutes);

export default app;