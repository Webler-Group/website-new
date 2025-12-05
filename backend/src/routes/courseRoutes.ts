import express from "express";
import verifyJWT from "../middleware/verifyJWT";
import courseController from "../controllers/courseController";
import protectRoute from "../middleware/protectRoute";
import requestLimiter from "../middleware/requestLimiter";
import verifyEmail from "../middleware/verifyEmail";

const router = express.Router();

router.use(verifyJWT);

router.route("/").post(courseController.getCourseList);

router.use(protectRoute);

router.route("/GetUserCourses").post(courseController.getUserCourseList);
router.route("/GetCourse").post(courseController.getCourse);
router.route("/GetLesson").post(courseController.getLesson);
router.route("/GetLessonNode").post(courseController.getLessonNode);
router.route("/SolveNode").post(courseController.solve);
router.route("/ResetCourseProgress").post(courseController.resetCourseProgress);
router.route("/GetComments").post(courseController.getLessonComments);
router.route("/CreateComment").post(verifyEmail, requestLimiter(300, 10, "Too many requests, try again later"), courseController.createLessonComment);
router.route("/EditComment").put(courseController.editLessonComment);
router.route("/DeleteComment").delete(courseController.deleteLessonComment);

export default router;