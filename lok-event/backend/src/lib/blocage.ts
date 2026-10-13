// lok-event/backend/src/lib/blocage.ts
// Blocage entre utilisateurs : si A bloque B (ou B bloque A), ils ne peuvent
// plus s'écrire ni réserver l'un chez l'autre.
import { prisma } from "./prisma";

/** Vrai si l'un des deux utilisateurs a bloqué l'autre */
export async function blocageEntre(userA: string, userB: string): Promise<boolean> {
  const blocage = await prisma.blocage.findFirst({
    where: {
      OR: [
        { bloqueurId: userA, bloqueId: userB },
        { bloqueurId: userB, bloqueId: userA },
      ],
    },
    select: { id: true },
  });
  return Boolean(blocage);
}

/** Ids des utilisateurs que `userId` a bloqués ou qui l'ont bloqué */
export async function idsBloques(userId: string): Promise<Set<string>> {
  const blocages = await prisma.blocage.findMany({
    where: { OR: [{ bloqueurId: userId }, { bloqueId: userId }] },
    select: { bloqueurId: true, bloqueId: true },
  });
  const ids = new Set<string>();
  for (const b of blocages) {
    ids.add(b.bloqueurId === userId ? b.bloqueId : b.bloqueurId);
  }
  return ids;
}

export const MESSAGE_BLOCAGE =
  "Vous ne pouvez plus échanger avec cet utilisateur.";