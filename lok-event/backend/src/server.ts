// backend/src/server.ts
import http from "http";
import app from "./app";
import { initSocket } from "./lib/socket";

const PORT = process.env.PORT || 5000;

// ⚠️ Socket.io a besoin du serveur HTTP brut, pas de app.listen()
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(`LOKEVENT API running on port ${PORT}`);
});