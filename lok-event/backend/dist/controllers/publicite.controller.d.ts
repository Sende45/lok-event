import { Request, Response } from "express";
/** GET /publicites?emplacement=ACCUEIL_CARROUSEL — pubs en cours de diffusion */
export declare const getPublicitesActives: (req: Request, res: Response) => Promise<void>;
/** POST /publicites/:id/affichage — la pub a été vue */
export declare const enregistrerAffichage: (req: Request, res: Response) => Promise<void>;
/** POST /publicites/:id/clic — la pub a été touchée */
export declare const enregistrerClic: (req: Request, res: Response) => Promise<void>;
/** GET /publicites/admin/toutes — toutes les pubs avec leurs statistiques */
export declare const listerPublicitesAdmin: (_req: Request, res: Response) => Promise<void>;
/** POST /publicites */
export declare const creerPublicite: (req: Request, res: Response) => Promise<void>;
/** PUT /publicites/:id */
export declare const modifierPublicite: (req: Request, res: Response) => Promise<void>;
/** DELETE /publicites/:id */
export declare const supprimerPublicite: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=publicite.controller.d.ts.map