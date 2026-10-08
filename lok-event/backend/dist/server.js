"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/server.ts
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./lib/socket");
const PORT = process.env.PORT || 5000;
// ⚠️ Socket.io a besoin du serveur HTTP brut, pas de app.listen()
const server = http_1.default.createServer(app_1.default);
(0, socket_1.initSocket)(server);
server.listen(PORT, () => {
    console.log(`LOKEVENT API running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map