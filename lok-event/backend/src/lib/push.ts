// backend/src/lib/push.ts
//
// Notifications push vers l'application mobile (même app fermée), via le
// service gratuit d'Expo : https://exp.host/--/api/v2/push/send
// - Chaque téléphone enregistre son "Expo push token" (POST /notifications/push-token)
// - envoyerPush(userId, ...) envoie la notification à TOUS les téléphones de l'utilisateur
// - Les tokens morts (app désinstallée, notifications refusées) sont supprimés automatiquement
//
// Un échec d'envoi n'est jamais bloquant : on log et on continue.

import { prisma } from "./prisma";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const TAILLE_LOT = 100; // limite Expo : 100 messages par requête

export type DonneesPush = Record<string, string | number | boolean | null | undefined>;

interface TicketExpo {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

export function estTokenExpo(token: unknown): token is string {
  return (
    typeof token === "string" &&
    token.length < 200 &&
    /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token)
  );
}

export async function envoyerPush(
  userId: string,
  titre: string,
  corps: string,
  donnees: DonneesPush = {}
): Promise<void> {
  try {
    const tokens = await prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const messages = tokens.map(({ token }) => ({
      to: token,
      title: titre,
      body: corps,
      data: donnees,
      sound: "default",
      priority: "high",
      channelId: "default",
    }));

    const tokensMorts: string[] = [];

    for (let i = 0; i < messages.length; i += TAILLE_LOT) {
      const lot = messages.slice(i, i + TAILLE_LOT);
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      // Optionnel : si tu actives "Enhanced security for push notifications" sur expo.dev
      if (process.env.EXPO_ACCESS_TOKEN) {
        headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
      }

      const reponse = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(lot),
      });

      if (!reponse.ok) {
        console.error("Push Expo refusé :", reponse.status, await reponse.text().catch(() => ""));
        continue;
      }

      const resultat = (await reponse.json().catch(() => null)) as { data?: TicketExpo[] } | null;
      resultat?.data?.forEach((ticket, index) => {
        if (ticket.status === "error") {
          if (ticket.details?.error === "DeviceNotRegistered") {
            tokensMorts.push(lot[index].to);
          } else {
            console.error("Ticket push en erreur :", ticket.message);
          }
        }
      });
    }

    if (tokensMorts.length > 0) {
      await prisma.pushToken.deleteMany({ where: { token: { in: tokensMorts } } });
    }
  } catch (error) {
    console.error("Erreur envoi push :", error);
  }
}