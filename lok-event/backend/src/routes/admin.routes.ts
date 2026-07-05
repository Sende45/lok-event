import { Router } from "express";
import {
  getStats,
  getRecentBookings,
  getPendingProviders,
  verifyProvider,
  rejectProvider,
  getAllProviders,
  toggleProviderActive,
  getAllUsers,
} from "../controllers/admin.controller";
import { protect } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/admin.middleware";

const router = Router();

router.use(protect, requireAdmin);

router.get("/stats", getStats);
router.get("/bookings/recent", getRecentBookings);

router.get("/providers/pending", getPendingProviders);
router.patch("/providers/:id/verify", verifyProvider);
router.patch("/providers/:id/reject", rejectProvider);
router.get("/providers", getAllProviders);
router.patch("/providers/:id/toggle-active", toggleProviderActive);

router.get("/users", getAllUsers);

export default router;