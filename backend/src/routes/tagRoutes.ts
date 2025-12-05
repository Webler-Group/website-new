import express from "express";
import tagController from "../controllers/tagController";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import requireRoles from "../middleware/requireRoles";
import RolesEnum from "../data/RolesEnum";

const router = express.Router();

router.use(verifyJWT);

router.route("/").post(tagController.getTagList);
router.route("/GetTag").post(tagController.getTag);

router.use(protectRoute);

router.route("/ExecuteJobs").post(requireRoles([RolesEnum.ADMIN, RolesEnum.MODERATOR]), tagController.executeTagJobs);


export default router;
