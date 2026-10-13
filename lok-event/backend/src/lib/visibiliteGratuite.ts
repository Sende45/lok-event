// lok-event/backend/src/lib/visibiliteGratuite.ts
//
// Phase de lancement : les 50 premiers prestataires inscrits (par date
// d'inscription) sont visibles en entier gratuitement, comme s'ils étaient
// Premium. À partir du 51e, un prestataire sans Premium actif est flouté.
//
// Le quota peut être changé sans toucher au code avec la variable
// d'environnement QUOTA_PRESTATAIRES_GRATUITS (mettre 0 pour désactiver).
import { prisma } from "./prisma";

const quotaEnv = Number(process.env.QUOTA_PRESTATAIRES_GRATUITS);
export const QUOTA_GRATUIT = Number.isFinite(quotaEnv) && quotaEnv >= 0 ? quotaEnv : 50;

// Petit cache pour ne pas refaire la requête à chaque appel de l'API
const DUREE_CACHE_MS = 60_000;
let cache: { userIds: Set<string>; expire: number } | null = null;

/** userId des prestataires visibles gratuitement (les QUOTA_GRATUIT premiers inscrits) */
export async function userIdsVisiblesGratuitement(): Promise<Set<string>> {
  if (QUOTA_GRATUIT === 0) return new Set();
  if (cache && cache.expire > Date.now()) return cache.userIds;

  // Seuls les comptes actifs prennent une des places gratuites
  const premiers = await prisma.prestataire.findMany({
    where: { actif: true, user: { actif: true } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: QUOTA_GRATUIT,
    select: { userId: true },
  });

  const userIds = new Set<string>(premiers.map((p: { userId: string }) => p.userId));
  cache = { userIds, expire: Date.now() + DUREE_CACHE_MS };
  return userIds;
}

/** Vrai si ce prestataire fait partie des QUOTA_GRATUIT premiers inscrits */
export async function estVisibleGratuitement(userId: string): Promise<boolean> {
  return (await userIdsVisiblesGratuitement()).has(userId);
}