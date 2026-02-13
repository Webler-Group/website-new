// routes/mediaRoutes.ts
import { Router } from "express";
import mediaController from "../controllers/mediaController";

const router = Router();
router.get("/files/:fileId", mediaController.getFileById);

export default router;
