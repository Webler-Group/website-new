import { Router } from "express";
import mediaController from "../controllers/mediaController";

const router = Router();
router.get("/files/:hash", mediaController.getFileByHash);
router.get("/files/:hash/preview", mediaController.getFilePreviewByHash);

export default router;
