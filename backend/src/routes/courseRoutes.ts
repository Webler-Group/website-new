import express from "express";
import verifyJWT from "../middleware/verifyJWT";
import courseController from "../controllers/courseController";
import protectRoute from "../middleware/protectRoute";

const router = express.Router();

router.use(verifyJWT);

router.route("/")
    .post(courseController.getCourseList);
router.route("/GetUserCourses")
    .post(courseController.getUserCourseList);

router.use(protectRoute);

export default router;