import { Server as HttpServer } from "http";
import { Server } from "socket.io";
/** Un Premium est actif si le flag est posé ET que l'abonnement n'est pas expiré. */
export declare function premiumEstActif(user: {
    estPremium: boolean;
    premiumJusquau: Date | null;
}): boolean;
export declare function initSocket(httpServer: HttpServer): Server;
export declare function getIO(): Server;
/** Émet un événement à un utilisateur précis (toutes ses sessions). */
export declare function emitToUser(userId: string, event: string, data: unknown): void;
/** Émet un événement à TOUS les clients Premium connectés. */
export declare function emitToPremium(event: string, data: unknown): void;
/**
 * Fait rejoindre/quitter la room Premium aux sessions déjà connectées d'un
 * utilisateur, sans attendre sa reconnexion. À appeler après une activation
 * ou une désactivation dans le contrôleur premium.
 */
export declare function rafraichirRoomPremium(userId: string, estPremium: boolean): Promise<void>;
//# sourceMappingURL=socket.d.ts.map