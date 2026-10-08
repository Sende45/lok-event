"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const admin_middleware_1 = require("../middlewares/admin.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect, admin_middleware_1.requireAdmin);
router.get("/stats", admin_controller_1.getStats);
router.get("/bookings/recent", admin_controller_1.getRecentBookings);
router.get("/providers/pending", admin_controller_1.getPendingProviders);
router.patch("/providers/:id/verify", admin_controller_1.verifyProvider);
router.patch("/providers/:id/reject", admin_controller_1.rejectProvider);
router.get("/providers", admin_controller_1.getAllProviders);
router.patch("/providers/:id/toggle-active", admin_controller_1.toggleProviderActive);
router.get("/users", admin_controller_1.getAllUsers);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map