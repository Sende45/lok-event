// lok-event/backend/src/controllers/upload.controller.ts
// Réception d'une image envoyée par l'app ou le site, puis envoi sur Cloudinary.
//   POST /api/prestataires/photos/upload  → dossier "prestataires"
//   POST /api/auth/avatar                 → dossier "avatars"
//   POST /api/publicites/upload           → dossier "publicites"
// Réponse : { url } — l'URL est ensuite enregistrée par la route habituelle
// (ajout de photo, profil, publicité).
import { Request, Response } from "express";
import multer from "multer";
import { envoyerImage, type DossierImage } from "../lib/cloudinary";

const TYPES_AUTORISES = ["image/jpeg", "image/png", "image/webp"];

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (_req, file, cb) => {
    if (!TYPES_AUTORISES.includes(file.mimetype)) {
      cb(new Error("Format d'image non autorisé (JPEG, PNG ou WebP uniquement)"));
      return;
    }
    cb(null, true);
  },
});

/** Fabrique le contrôleur d'upload pour un dossier Cloudinary donné */
export const uploadImage = (dossier: DossierImage) => async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "Aucun fichier envoyé" });
      return;
    }
    const url = await envoyerImage(req.file.buffer, dossier, req.file.mimetype);
    res.json({ url });
  } catch (error) {
    console.error(`Erreur upload image (${dossier}):`, error);
    res.status(502).json({ message: "Échec de l'envoi de l'image. Réessayez." });
  }
};