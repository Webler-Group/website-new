import express from "express";
import verifyJWT from "../middleware/verifyJWT";
import courseController, { coverImageUpload } from "../controllers/courseController";

const router = express.Router();

router.use(verifyJWT);

router.route("/").post(courseController.getCoursesList);
router.route("/GetCourse").post(courseController.getCourse);
router.route("/CreateCourse").post(courseController.createCourse);
router.route("/EditCourse").put(courseController.editCourse);
router.route("/DeleteCourse").delete(courseController.deleteCourse);
router.route("/UploadCourseCoverImage").post(coverImageUpload.single("coverImage"), courseController.uploadCourseCoverImage);

router.route("/GetLesson").post(courseController.getLesson);
router.route("/CreateLesson").post(courseController.createLesson);
router.route("/GetLessonList").post(courseController.getLessonList);
router.route("/EditLesson").put(courseController.editLesson);
router.route("/DeleteLesson").delete(courseController.deleteLesson);

router.route("/GetLessonNode").post(courseController.getLessonNode);
router.route("/CreateLessonNode").post(courseController.createLessonNode);
router.route("/DeleteLessonNode").delete(courseController.deleteLessonNode);
router.route("/EditLessonNode").put(courseController.editLessonNode);
router.route("/ChangeLessonNodeIndex").post(courseController.changeLessonNodeIndex);

export default router;