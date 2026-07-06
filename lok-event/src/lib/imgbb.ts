import { api } from "./api";

export async function uploadToImgbb(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const token = localStorage.getItem("lokevent_token");
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const res = await fetch(`${API_URL}/prestataires/photos/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Échec de l'upload de l'image");
  }

  return data.url as string;
}