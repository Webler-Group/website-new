import { Router } from "express";
import adminController from "../controllers/adminController";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import requireRoles from "../middleware/requireRoles";

const router = Router();

router.use(verifyJWT);

router.use(protectRoute);

router.route("/BanUser").post(requireRoles(["Admin", "Moderator"]), adminController.banUser);
router.route("/Users").post(requireRoles(["Admin", "Moderator"]), adminController.getUsersList);
router.route("/GetUser").post(requireRoles(["Admin", "Moderator"]), adminController.getUser);
router.route("/UpdateRoles").post(requireRoles(["Admin"]), adminController.updateRoles);

export default router;