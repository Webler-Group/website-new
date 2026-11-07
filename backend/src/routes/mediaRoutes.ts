import { Router } from "express";
import mediaController from "../controllers/mediaController";

const router = Router();
router.get("/files/:hash", mediaController.getFileByHash);
router.get("/files/:hash/preview", mediaController.getFilePreviewByHash);
router.get("/files/:hash/:filename", mediaController.getFileByHashWithName);

export default router;
