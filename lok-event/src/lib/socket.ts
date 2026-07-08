import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer;

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("Utilisateur connecté :", socket.id);

    socket.on("join", (userId: string) => {
      socket.join(`user-${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("Utilisateur déconnecté");
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io non initialisé");
  return io;
};