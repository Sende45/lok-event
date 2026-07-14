// frontend/src/lib/socket.ts
//
// Client Socket.io LOKEVENT (singleton).
// - S'authentifie avec le JWT stocké dans localStorage (lokevent_token).
// - Écoute les notifications personnelles ET les annonces Premium.
//
// Utilisation dans un composant / layout :
//
//   import { getSocket, disconnectSocket } from "@/lib/socket";
//
//   useEffect(() => {
//     const socket = getSocket();
//     if (!socket) return;
//
//     const onNotif = (n) => { /* notifications personnelles */ };
//     socket.on("newNotification", onNotif);
//     socket.on("notification:premium", (n) => { /* annonces exclusives 💎 */ });
//     socket.on("premium:statut", ({ estPremium }) => { /* afficher le badge 💎 */ });
//
//     return () => {
//       // ⚠️ retirer UNIQUEMENT ses propres listeners — jamais de
//       // socket.disconnect() dans un composant : le socket est partagé.
//       socket.off("newNotification", onNotif);
//       socket.off("notification:premium");
//       socket.off("premium:statut");
//     };
//   }, []);
//
//   // À la déconnexion de l'utilisateur (logout) :
//   disconnectSocket();

import { io, Socket } from "socket.io-client";

const RAW_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ⚠️ Socket.io interprète le CHEMIN de l'URL comme un NAMESPACE.
// NEXT_PUBLIC_API_URL contient "/api" pour les routes REST
// (ex: https://lok-event.onrender.com/api) — si on le passe tel quel à io(),
// le client demande le namespace "/api" au serveur, qui répond
// "Invalid namespace". On ne garde donc que l'ORIGINE de l'URL
// (https://lok-event.onrender.com) pour la connexion temps réel.
function extraireOrigine(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    // URL malformée dans l'env : on la renvoie telle quelle plutôt que planter
    return url;
  }
}

const SOCKET_URL = extraireOrigine(RAW_URL);

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  // Jamais côté serveur (SSR Next.js)
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("lokevent_token");
  if (!token) return null;

  // Déjà créé (connecté OU en cours de reconnexion) : on réutilise.
  // Ne pas recréer un socket pendant une reconnexion, sinon on empile
  // les connexions — c'est ça qui provoquait les
  // "WebSocket is closed before the connection is established" en boucle.
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    // ⚠️ websocket DIRECT, sans étape polling : le handshake
    // polling→websocket casse derrière le proxy de Render
    // (c'est le 400 sur ?transport=polling&sid=... dans ta console).
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
  });

  socket.on("connect_error", (err) => {
    console.warn("Socket.io connexion échouée:", err.message);
  });

  return socket;
}

/** À appeler au logout pour couper proprement la connexion temps réel. */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}