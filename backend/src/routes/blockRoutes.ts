import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import { Router } from "express";
import BlockController from "../controllers/blockController";

const router = Router();

router.use(verifyJWT);
router.use(protectRoute);

router.route("/BlockUser").post(BlockController.blockUser);
router.route("/UnblockUser").post(BlockController.unblockUser);
router.route("/GetBlockedUsers").post(BlockController.getBlockedUsers);

export default router;