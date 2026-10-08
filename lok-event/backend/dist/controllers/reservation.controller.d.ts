import { Request, Response } from "express";
interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
export declare const creerReservation: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getMesReservations: (req: AuthRequest, res: Response) => Promise<void>;
export declare const annulerReservation: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateStatutReservation: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=reservation.controller.d.ts.map