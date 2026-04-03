import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import { Router } from "express";
import BlockController from "../controllers/blockController";

const router = Router();

router.use(verifyJWT);
router.use(protectRoute);

router.route("/").post(BlockController.blockUser);
router.route("/Unblock").post(BlockController.unblockUser);
router.route("/All").post(BlockController.getBlockedUsers);

export default router;