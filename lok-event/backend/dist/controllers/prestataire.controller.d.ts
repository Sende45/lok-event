import { Request, Response } from "express";
import multer from "multer";
interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
export declare const createPrestataireProfile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const addPrestatairePhoto: (req: AuthRequest, res: Response) => Promise<void>;
export declare const removePrestatairePhoto: (req: AuthRequest, res: Response) => Promise<void>;
export declare const uploadMiddleware: multer.Multer;
export declare const uploadPhotoToImgbb: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getPrestataireDashboard: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getPrestataireStats: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getPrestataireProfile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updatePrestataireProfile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getPrestataireBookings: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateBookingStatus: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getPrestataireReviews: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getPrestataireAnalytics: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getPrestatairesPublic: (req: Request, res: Response) => Promise<void>;
export declare const getPrestatairesProximite: (req: Request, res: Response) => Promise<void>;
export declare const getPrestatairePublic: (req: Request, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=prestataire.controller.d.ts.map