import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";
import { loginLimiter, registerLimiter } from "../middlewares/rateLimit.middleware";

const router = Router();
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.get("/me", protect, getMe);
export default router;