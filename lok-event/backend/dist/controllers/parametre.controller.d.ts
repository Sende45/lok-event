import { Request, Response } from "express";
interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
export declare const getParametresPaiement: (_req: Request, res: Response) => Promise<void>;
export declare const updateParametresPaiement: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=parametre.controller.d.ts.map