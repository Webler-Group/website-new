import express from "express";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import notificationController from "../controllers/notificationController";

const router = express.Router();

router.use(verifyJWT);

router.use(protectRoute());

router.route("/GetPublicKey").post(notificationController.getPublicKey);
router.route("/Subscribe").post(notificationController.subscribe);
router.route("/Unsubscribe").post(notificationController.unsubscribe);

export default router;
