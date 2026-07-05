import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import prestataireRoutes from "./routes/prestataire.routes";
import categorieRoutes from "./routes/categorie.routes";
import reservationRoutes from "./routes/reservation.routes";
import avisRoutes from "./routes/avis.routes";
import prisma from "./lib/prisma";
import adminRoutes from "./routes/admin.routes";
import tagRoutes from "./routes/tag.routes";
import favoriRoutes from "./routes/favori.routes";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL || "https://ton-frontend.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

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
app.listen(PORT, () => console.log(`LOKEVENT API running on port ${PORT}`));