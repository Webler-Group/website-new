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
router.route("/Users").post(requireRoles([RolesEnum.ADMIN, RolesEnum.MODERATOR]), adminController.getUsersList);
router.route("/GetUser").post(requireRoles([RolesEnum.ADMIN, RolesEnum.MODERATOR]), adminController.getUser);
router.route("/UpdateRoles").post(requireRoles([RolesEnum.ADMIN]), adminController.updateRoles);
router.route("/ImportCourse").post(requireRoles([RolesEnum.ADMIN, RolesEnum.MODERATOR]), adminController.importCourse);

export default router;