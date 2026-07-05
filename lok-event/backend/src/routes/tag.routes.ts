import { Router } from "express";
import { getTags, createTag, updateTag, deleteTag } from "../controllers/tag.controller";
import { protect, adminOnly } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getTags);
router.post("/", protect, adminOnly, createTag);
router.put("/:id", protect, adminOnly, updateTag);
router.delete("/:id", protect, adminOnly, deleteTag);

export default router;