import { Router } from "express";
import adminController from "../controllers/adminController";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import requireRoles from "../middleware/requireRoles";
import RolesEnum from "../data/RolesEnum";

const router = Router();

router.use(verifyJWT);

router.use(protectRoute);

router.route("/BanUser").post(requireRoles([RolesEnum.ADMIN, RolesEnum.MODERATOR]), adminController.banUser);
router.route("/Users").post(requireRoles([RolesEnum.ADMIN]), adminController.getUsersList);
router.route("/GetUser").post(requireRoles([RolesEnum.ADMIN]), adminController.getUser);
router.route("/UpdateUser").post(requireRoles([RolesEnum.ADMIN]), adminController.saveBasicInfo);

export default router;