// src/lib/imgbb.ts — envoi d'une photo de prestataire (stockée sur ImgBB par l'API)
import { envoyerFichier } from "./api";

export async function uploadToImgbb(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const data = await envoyerFichier<{ url: string }>("/prestataires/photos/upload", formData);
  return data.url;
}