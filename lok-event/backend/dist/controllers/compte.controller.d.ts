import { Request, Response } from "express";
/** PUT /auth/profil */
export declare const modifierProfil: (req: Request, res: Response) => Promise<void>;
/** PUT /auth/mot-de-passe */
export declare const changerMotDePasse: (req: Request, res: Response) => Promise<void>;
/** DELETE /auth/compte — suppression définitive du compte et de ses données */
export declare const supprimerCompte: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=compte.controller.d.ts.map