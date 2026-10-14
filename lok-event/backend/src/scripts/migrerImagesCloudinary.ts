// lok-event/backend/src/scripts/migrerImagesCloudinary.ts
// Migration UNIQUE des images déjà en ligne sur Imgbb vers Cloudinary :
// photos des prestataires, photos de profil et bannières publicitaires.
//
// Cloudinary télécharge lui-même chaque image depuis son URL Imgbb, puis la
// nouvelle URL remplace l'ancienne en base. Le script peut être relancé sans
// risque : il ne traite que les URL qui pointent encore vers Imgbb.
//
// Lancement (depuis lok-event/backend, avec DATABASE_URL + CLOUDINARY_* dans .env) :
//   npx dotenv -e .env -- npx ts-node src/scripts/migrerImagesCloudinary.ts --essai   ← compte seulement
//   npx dotenv -e .env -- npx ts-node src/scripts/migrerImagesCloudinary.ts           ← migre
import { PrismaClient } from "@prisma/client";
import { envoyerImage, type DossierImage } from "../lib/cloudinary";

const prisma = new PrismaClient();
const ESSAI = process.argv.includes("--essai");

const estImgbb = (url: string | null | undefined): url is string =>
  typeof url === "string" && /^https:\/\/([a-z0-9-]+\.)*ibb\.co\//i.test(url);

let migrees = 0;
let echecs = 0;

/** Envoie une image Imgbb sur Cloudinary ; en cas d'échec, garde l'ancienne URL */
async function migrer(url: string, dossier: DossierImage): Promise<string> {
  if (ESSAI) {
    migrees++;
    return url;
  }
  try {
    const nouvelle = await envoyerImage(url, dossier);
    migrees++;
    return nouvelle;
  } catch (err) {
    echecs++;
    console.error(`  ✗ ${url} : ${err instanceof Error ? err.message : err}`);
    return url;
  }
}

async function main() {
  console.log(ESSAI ? "Mode essai : aucune modification\n" : "Migration en cours…\n");

  // 1. Photos des prestataires
  const prestataires = await prisma.prestataire.findMany({ select: { id: true, nomEntreprise: true, photos: true } });
  for (const p of prestataires) {
    if (!p.photos.some(estImgbb)) continue;
    console.log(`Prestataire « ${p.nomEntreprise} »`);
    const photos: string[] = [];
    for (const url of p.photos) photos.push(estImgbb(url) ? await migrer(url, "prestataires") : url);
    if (!ESSAI) await prisma.prestataire.update({ where: { id: p.id }, data: { photos } });
  }

  // 2. Photos de profil
  const users = await prisma.user.findMany({
    where: { avatar: { contains: "ibb.co" } },
    select: { id: true, prenom: true, avatar: true },
  });
  for (const u of users) {
    if (!estImgbb(u.avatar)) continue;
    console.log(`Avatar de ${u.prenom}`);
    const avatar = await migrer(u.avatar, "avatars");
    if (!ESSAI && avatar !== u.avatar) await prisma.user.update({ where: { id: u.id }, data: { avatar } });
  }

  // 3. Bannières publicitaires
  const pubs = await prisma.publicite.findMany({
    where: { imageUrl: { contains: "ibb.co" } },
    select: { id: true, marque: true, imageUrl: true },
  });
  for (const pub of pubs) {
    if (!estImgbb(pub.imageUrl)) continue;
    console.log(`Bannière ${pub.marque}`);
    const imageUrl = await migrer(pub.imageUrl, "publicites");
    if (!ESSAI && imageUrl !== pub.imageUrl) await prisma.publicite.update({ where: { id: pub.id }, data: { imageUrl } });
  }

  console.log(
    `\n${ESSAI ? "À migrer" : "Migrées"} : ${migrees} image(s)` + (echecs ? ` — échecs : ${echecs} (relancez le script)` : "")
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());