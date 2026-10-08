import { Request, Response } from "express";
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
export declare const getNotifications: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const getUnreadCount: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const markAsRead: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const markAllAsRead: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const deleteNotification: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const deleteAllNotifications: (req: AuthenticatedRequest, res: Response) => Promise<void>;
export declare const sendNotification: (userId: string, type: any, title: string, message: string, data?: any) => Promise<{
    message: string;
    id: string;
    createdAt: Date;
    data: import("@prisma/client/runtime/library").JsonValue | null;
    userId: string;
    type: string;
    title: string;
    isRead: boolean;
} | undefined>;
export declare const notifierNouveauMessage: (destinataireUserId: string, expediteur: {
    prenom: string;
    nom?: string;
}, conversationId: string, messageId: string, contenu?: string) => Promise<{
    message: string;
    id: string;
    createdAt: Date;
    data: import("@prisma/client/runtime/library").JsonValue | null;
    userId: string;
    type: string;
    title: string;
    isRead: boolean;
} | undefined>;
export declare const notifierNouvelleReservation: (prestataireId: string, client: {
    prenom: string;
    nom: string;
}, reservation: {
    id: string;
    typeEvenement: string;
    dateEvenement: Date;
}) => Promise<{
    message: string;
    id: string;
    createdAt: Date;
    data: import("@prisma/client/runtime/library").JsonValue | null;
    userId: string;
    type: string;
    title: string;
    isRead: boolean;
} | undefined>;
export declare const notifierStatutReservation: (clientUserId: string, nomEntreprise: string, statut: string, reservation: {
    id: string;
    dateEvenement: Date;
}) => Promise<{
    message: string;
    id: string;
    createdAt: Date;
    data: import("@prisma/client/runtime/library").JsonValue | null;
    userId: string;
    type: string;
    title: string;
    isRead: boolean;
} | undefined>;
export declare const notifierAnnulationParClient: (prestataireId: string, client: {
    prenom: string;
    nom: string;
}, reservation: {
    id: string;
    dateEvenement: Date;
}) => Promise<{
    message: string;
    id: string;
    createdAt: Date;
    data: import("@prisma/client/runtime/library").JsonValue | null;
    userId: string;
    type: string;
    title: string;
    isRead: boolean;
} | undefined>;
export {};
//# sourceMappingURL=notification.controller.d.ts.map