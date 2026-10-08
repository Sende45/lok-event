import { Request, Response } from "express";
interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
export declare const getPacks: (_req: Request, res: Response) => Promise<void>;
export declare const getMonStatut: (req: AuthRequest, res: Response) => Promise<void>;
export declare const souscrire: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getDemandes: (req: AuthRequest, res: Response) => Promise<void>;
export declare const validerDemande: (req: AuthRequest, res: Response) => Promise<void>;
export declare const refuserDemande: (req: AuthRequest, res: Response) => Promise<void>;
export declare const desactiverPremium: (req: AuthRequest, res: Response) => Promise<void>;
export declare const envoyerAnnoncePremium: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=premium.controller.d.ts.map