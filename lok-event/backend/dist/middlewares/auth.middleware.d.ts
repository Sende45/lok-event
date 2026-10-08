import { Request, Response, NextFunction } from "express";
export type AuthRequest = Request;
export declare const protect: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const adminOnly: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map