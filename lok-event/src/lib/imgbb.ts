export async function uploadToImgbb(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(
    `https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_API_KEY}`,
    { method: "POST", body: formData }
  );

  const data = await res.json();

  if (!data.success) {
    throw new Error("Échec de l'upload de l'image");
  }

  return data.data.url as string;
}