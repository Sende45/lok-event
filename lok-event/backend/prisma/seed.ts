import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const categories = [
  { nom: "Traiteur", slug: "traiteur", icone: "🍽️", couleur: "#D4A017" },
  { nom: "Décoration", slug: "decoration", icone: "🎨", couleur: "#E8B830" },
  { nom: "Salles", slug: "salles", icone: "🏛️", couleur: "#14B8A6" },
  { nom: "Photographie", slug: "photographie", icone: "📷", couleur: "#0D9488" },
  { nom: "DJ & Musique", slug: "dj-musique", icone: "🎵", couleur: "#8B5CF6" },
];

const tags = [
  // Personnel
  { nom: "Serveurs", slug: "serveurs", groupe: "PERSONNEL", icone: "🧑‍💼" },
  { nom: "Barmen", slug: "barmen", groupe: "PERSONNEL", icone: "🍸" },
  { nom: "Hôtesses", slug: "hotesses", groupe: "PERSONNEL", icone: "💁" },
  { nom: "Chef à domicile", slug: "chef-domicile", groupe: "PERSONNEL", icone: "👨‍🍳" },
  { nom: "Plongeurs", slug: "plongeurs", groupe: "PERSONNEL", icone: "🧽" },
  // Technique
  { nom: "Lumière", slug: "lumiere", groupe: "TECHNIQUE", icone: "💡" },
  { nom: "Sonorisation", slug: "sonorisation", groupe: "TECHNIQUE", icone: "🔊" },
  { nom: "Impression", slug: "impression", groupe: "TECHNIQUE", icone: "🖨️" },
  { nom: "Vidéo", slug: "video", groupe: "TECHNIQUE", icone: "🎥" },
  { nom: "Streaming", slug: "streaming", groupe: "TECHNIQUE", icone: "📡" },
  // Événementiel
  { nom: "Animation", slug: "animation", groupe: "EVENEMENTIEL", icone: "🎭" },
  { nom: "Sécurité", slug: "securite", groupe: "EVENEMENTIEL", icone: "🛡️" },
  { nom: "Coordination", slug: "coordination", groupe: "EVENEMENTIEL", icone: "📋" },
  { nom: "Logistique", slug: "logistique", groupe: "EVENEMENTIEL", icone: "📦" },
  { nom: "Décoration", slug: "decoration-tag", groupe: "EVENEMENTIEL", icone: "🎨" },
];

async function seedCategories() {
  for (const cat of categories) {
    const existante = await prisma.categorie.findUnique({ where: { slug: cat.slug } });
    if (existante) {
      console.log(`Catégorie "${cat.nom}" existe déjà, ignorée.`);
      continue;
    }
    await prisma.categorie.create({ data: cat });
    console.log(`Catégorie créée : ${cat.nom}`);
  }
}

async function seedTags() {
  for (const tag of tags) {
    const existant = await prisma.tag.findUnique({ where: { slug: tag.slug } });
    if (existant) {
      console.log(`Tag "${tag.nom}" existe déjà, ignoré.`);
      continue;
    }
    await prisma.tag.create({ data: tag });
    console.log(`Tag créé : ${tag.nom}`);
  }
}

async function seedAdmin() {
  const email = "yohannesende@gmail.com";

  const existant = await prisma.user.findUnique({ where: { email } });
  if (existant) {
    console.log("Un admin existe déjà avec cet email.");
    return;
  }

  const motDePasseTemporaire = "Yohane#0719306560Nour";
  const hash = await bcrypt.hash(motDePasseTemporaire, 12);

  const admin = await prisma.user.create({
    data: {
      nom: "Admin",
      prenom: "LokEvent",
      email,
      motDePasse: hash,
      role: "ADMIN",
    },
  });

  console.log("Admin créé :", admin.email);
  console.log("Mot de passe temporaire :", motDePasseTemporaire);
}

async function main() {
  await seedCategories();
  await seedTags();
  await seedAdmin();
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());