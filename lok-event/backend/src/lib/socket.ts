// backend/src/lib/socket.ts
//
// Module Socket.io LOKEVENT — version fusionnée.
// - Authentifie chaque connexion via le JWT (même token que l'API, envoyé
//   par le client dans `auth.token`). L'identité vient TOUJOURS du token
//   vérifié côté serveur, jamais d'un emit du client (faille de l'ancienne
//   version : n'importe qui pouvait rejoindre la room d'un autre utilisateur).
// - Chaque utilisateur rejoint sa room personnelle sous DEUX formats :
//     user:<id>  (nouveau format)
//     user-<id>  (ancien format → ton notification.controller continue de
//                 fonctionner sans aucune modification)
// - Les utilisateurs Premium ACTIFS rejoignent en plus la room `clients-premium`.
//
// Intégration dans server.ts :
//   import { createServer } from "http";
//   import { initSocket } from "./lib/socket";
//   const httpServer = createServer(app);
//   initSocket(httpServer);
//   httpServer.listen(PORT, ...);   // et non app.listen
//
// ⚠️ Changement requis côté frontend : la connexion doit maintenant envoyer
// le token (sinon elle est refusée) :
//   const socket = io(API_URL, { auth: { token: localStorage.getItem("lokevent_token") } });
// L'ancien socket.emit("join", userId) peut rester dans le code sans danger
// (il est ignoré), mais tu peux le supprimer tranquillement.

import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

const ROOM_PREMIUM = "clients-premium";

let io: Server | null = null;

interface JwtPayload {
  id?: string;
  userId?: string;
  email?: string;
  role?: string;
}

/** Un Premium est actif si le flag est posé ET que l'abonnement n'est pas expiré. */
export function premiumEstActif(user: {
  estPremium: boolean;
  premiumJusquau: Date | null;
}): boolean {
  if (!user.estPremium) return false;
  if (!user.premiumJusquau) return true; // premium sans date limite (offert, admin, etc.)
  return user.premiumJusquau > new Date();
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      credentials: true,
    },
  });

  // Middleware d'authentification : refuse la connexion sans JWT valide
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || "").replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentification requise"));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      const userId = payload.id || payload.userId;
      if (!userId) {
        return next(new Error("Token invalide"));
      }

      socket.data.userId = userId;
      next();
    } catch {
      next(new Error("Token invalide ou expiré"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId as string;
    console.log("Utilisateur connecté :", userId);

    // Room personnelle sous les deux formats (nouveau + ancien).
    // L'ancien format `user-<id>` garantit que le notification.controller
    // existant continue d'émettre correctement sans être modifié.
    socket.join(`user:${userId}`);
    socket.join(`user-${userId}`);

    // Rétrocompatibilité : l'ancien frontend émet encore "join".
    // On l'accepte silencieusement mais on N'UTILISE PAS l'userId envoyé
    // par le client (c'est le token qui fait foi). Ça évite toute erreur
    // le temps de déployer le nouveau client socket.
    socket.on("join", () => {
      // no-op volontaire : les rooms sont déjà jointes depuis le JWT
    });

    // Room Premium : vérifiée en base à CHAQUE connexion, jamais depuis le JWT.
    // Ainsi une activation, une expiration ou une révocation prend effet
    // dès la reconnexion suivante, sans avoir à réémettre de token.
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { estPremium: true, premiumJusquau: true },
      });

      if (user && premiumEstActif(user)) {
        socket.join(ROOM_PREMIUM);
        socket.emit("premium:statut", { estPremium: true, jusquau: user.premiumJusquau });
      } else {
        socket.emit("premium:statut", { estPremium: false });
      }
    } catch (err) {
      console.error("Erreur vérification premium à la connexion socket:", err);
    }

    socket.on("disconnect", () => {
      console.log("Utilisateur déconnecté :", userId);
    });
  });

  console.log("✅ Socket.io initialisé (rooms: user:<id>, user-<id>, clients-premium)");
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io n'est pas initialisé. Appelle initSocket(httpServer) d'abord.");
  }
  return io;
}

/** Émet un événement à un utilisateur précis (toutes ses sessions). */
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/** Émet un événement à TOUS les clients Premium connectés. */
export function emitToPremium(event: string, data: unknown): void {
  if (!io) return;
  io.to(ROOM_PREMIUM).emit(event, data);
}

/**
 * Fait rejoindre/quitter la room Premium aux sessions déjà connectées d'un
 * utilisateur, sans attendre sa reconnexion. À appeler après une activation
 * ou une désactivation dans le contrôleur premium.
 */
export async function rafraichirRoomPremium(userId: string, estPremium: boolean): Promise<void> {
  if (!io) return;
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  for (const s of sockets) {
    if (estPremium) {
      s.join(ROOM_PREMIUM);
    } else {
      s.leave(ROOM_PREMIUM);
    }
    s.emit("premium:statut", { estPremium });
  }
}