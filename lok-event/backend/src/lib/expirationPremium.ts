// lok-event/backend/src/lib/expirationPremium.ts
//
// Repasse estPremium à false pour les abonnements arrivés à échéance.
// Appelé avant chaque recherche publique : sans ça, un Premium expiré
// restait classé en tête tant qu'il n'ouvrait pas lui-même sa page /premium.
// Exécuté au plus une fois par minute pour ne pas charger la base.
import { prisma } from "./prisma";

const INTERVALLE_MS = 60_000;
let dernierPassage = 0;

export async function expirerPremiumsEchus(): Promise<void> {
  if (Date.now() - dernierPassage < INTERVALLE_MS) return;
  dernierPassage = Date.now();

  const maintenant = new Date();
  try {
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { estPremium: true, premiumJusquau: { lte: maintenant } },
        data: { estPremium: false },
      }),
      prisma.abonnement.updateMany({
        where: { statut: "ACTIF", finLe: { lte: maintenant } },
        data: { statut: "EXPIRE" },
      }),
    ]);
  } catch (error) {
    // Une erreur ici ne doit jamais bloquer la recherche
    console.error("Erreur expiration Premium:", error);
  }
}