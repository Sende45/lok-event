// backend/src/lib/socket.ts
import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer): SocketIOServer => {
  if (io) return io;

  io = new SocketIOServer(server, {
    cors: {
      origin: ["http://localhost:3000", process.env.FRONTEND_URL || ""].filter(Boolean),
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connecté : ${socket.id}`);

    // L'utilisateur rejoint sa room personnelle
    socket.on("join", (userId: string) => {
      socket.join(`user-${userId}`);
      console.log(`Utilisateur ${userId} rejoint sa room`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket déconnecté : ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.io n'est pas initialisé. Appelle initSocket d'abord.");
  }
  return io;
};