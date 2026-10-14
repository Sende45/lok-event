// lok-event/backend/src/lib/cloudinary.ts
// Stockage des images (photos des prestataires, avatars, bannières publicitaires)
// sur Cloudinary, via son API REST signée : aucune dépendance npm, et la clé
// secrète ne quitte jamais le serveur.
//
// Variables d'environnement (Railway) :
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
import crypto from "crypto";

export type DossierImage = "prestataires" | "avatars" | "publicites";

// Taille max conservée à l'envoi : au-delà, Cloudinary réduit l'image
// (économise le stockage ; largement suffisant pour un écran de téléphone)
const TRANSFORMATION_ENVOI = "c_limit,w_1600,h_1600";

// Livraison optimisée : format moderne (WebP/AVIF) et compression automatiques
const TRANSFORMATION_LIVRAISON = "f_auto,q_auto";

function config() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const cle = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !cle || !secret) {
    throw new Error("Cloudinary non configuré (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET manquants)");
  }
  return { cloud, cle, secret };
}

/** Signature Cloudinary : paramètres triés "a=1&b=2" + secret, en SHA-1 */
function signer(params: Record<string, string>, secret: string): string {
  const chaine = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(chaine + secret).digest("hex");
}

/** Ajoute f_auto,q_auto à l'URL renvoyée par Cloudinary */
function urlOptimisee(secureUrl: string): string {
  return secureUrl.replace("/image/upload/", `/image/upload/${TRANSFORMATION_LIVRAISON}/`);
}

/**
 * Envoie une image sur Cloudinary et renvoie son URL optimisée.
 * `fichier` : un Buffer (upload depuis l'app) ou une URL https (migration).
 */
export async function envoyerImage(
  fichier: Buffer | string,
  dossier: DossierImage,
  mimetype = "image/jpeg"
): Promise<string> {
  const { cloud, cle, secret } = config();

  const params: Record<string, string> = {
    folder: `lokevent/${dossier}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
    transformation: TRANSFORMATION_ENVOI,
  };

  const form = new FormData();
  form.append(
    "file",
    typeof fichier === "string" ? fichier : `data:${mimetype};base64,${fichier.toString("base64")}`
  );
  for (const [k, v] of Object.entries(params)) form.append(k, v);
  form.append("api_key", cle);
  form.append("signature", signer(params, secret));

  const reponse = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = (await reponse.json()) as { secure_url?: string; error?: { message: string } };

  if (!reponse.ok || !data.secure_url) {
    throw new Error(`Échec Cloudinary : ${data.error?.message ?? reponse.status}`);
  }
  return urlOptimisee(data.secure_url);
}

/** Vrai si l'URL est une image de NOTRE compte Cloudinary */
export function estImageCloudinary(url: unknown): url is string {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  return (
    typeof url === "string" &&
    !!cloud &&
    url.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`)
  );
}

/**
 * Retrouve le public_id à partir de l'URL :
 * https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto/v1712/lokevent/avatars/abc.jpg
 *   → lokevent/avatars/abc
 */
function publicIdDepuisUrl(url: string): string | null {
  const apres = url.split("/image/upload/")[1];
  if (!apres) return null;
  const morceaux = apres.split("/");
  // On saute les segments de transformation (f_auto,q_auto…) et la version (v123)
  while (
    morceaux.length > 1 &&
    (/^v\d+$/.test(morceaux[0]) || /^[a-z]{1,3}_[^/]*(,[a-z]{1,3}_[^/]*)*$/.test(morceaux[0]))
  ) {
    morceaux.shift();
  }
  const chemin = morceaux.join("/");
  return chemin.replace(/\.[a-z0-9]+$/i, "") || null;
}

/**
 * Supprime des images de Cloudinary. Les URL d'ailleurs (anciennes Imgbb,
 * Unsplash…) sont ignorées. Ne lève jamais d'erreur : une image restée en
 * ligne ne doit pas faire échouer la suppression d'un compte ou d'une photo.
 */
export async function supprimerImages(urls: Array<string | null | undefined>): Promise<void> {
  const aSupprimer = urls.filter(estImageCloudinary);
  if (aSupprimer.length === 0) return;

  let conf: ReturnType<typeof config>;
  try {
    conf = config();
  } catch {
    return;
  }

  await Promise.all(
    aSupprimer.map(async (url) => {
      const publicId = publicIdDepuisUrl(url);
      if (!publicId) return;
      try {
        const params: Record<string, string> = {
          invalidate: "true",
          public_id: publicId,
          timestamp: String(Math.floor(Date.now() / 1000)),
        };
        const form = new FormData();
        for (const [k, v] of Object.entries(params)) form.append(k, v);
        form.append("api_key", conf.cle);
        form.append("signature", signer(params, conf.secret));
        await fetch(`https://api.cloudinary.com/v1_1/${conf.cloud}/image/destroy`, {
          method: "POST",
          body: form,
        });
      } catch (err) {
        console.error("Suppression Cloudinary échouée :", publicId, err);
      }
    })
  );
}