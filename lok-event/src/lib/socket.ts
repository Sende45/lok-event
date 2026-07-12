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
//     socket.on("notification", (n) => { /* notifications personnelles */ });
//     socket.on("notification:premium", (n) => { /* annonces exclusives 💎 */ });
//     socket.on("premium:statut", ({ estPremium }) => { /* afficher le badge 💎 */ });
//
//     return () => {
//       socket.off("notification");
//       socket.off("notification:premium");
//       socket.off("premium:statut");
//     };
//   }, []);
//
//   // À la déconnexion de l'utilisateur (logout) :
//   disconnectSocket();

import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  // Jamais côté serveur (SSR Next.js)
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("lokevent_token");
  if (!token) return null;

  if (socket && socket.connected) return socket;

  socket = io(API_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
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