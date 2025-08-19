import express from "express";
import verifyJWT from "../middleware/verifyJWT";
import courseEditorController from "../controllers/courseEditorController";

const router = express.Router();

router.use(verifyJWT);

router.route("/").post(courseEditorController.getCoursesList);
router.route("/GetCourse").post(courseEditorController.getCourse);
router.route("/CreateCourse").post(courseEditorController.createCourse);
router.route("/EditCourse").put(courseEditorController.editCourse);
router.route("/DeleteCourse").delete(courseEditorController.deleteCourse);
router.route("/UploadCourseCoverImage").post(courseEditorController.coverImageUpload.single("coverImage"), courseEditorController.uploadCourseCoverImage);

router.route("/GetLesson").post(courseEditorController.getLesson);
router.route("/CreateLesson").post(courseEditorController.createLesson);
router.route("/GetLessonList").post(courseEditorController.getLessonList);
router.route("/EditLesson").put(courseEditorController.editLesson);
router.route("/DeleteLesson").delete(courseEditorController.deleteLesson);
router.route("/ChangeLessonIndex").post(courseEditorController.changeLessonIndex);

router.route("/GetLessonNode").post(courseEditorController.getLessonNode);
router.route("/CreateLessonNode").post(courseEditorController.createLessonNode);
router.route("/DeleteLessonNode").delete(courseEditorController.deleteLessonNode);
router.route("/EditLessonNode").put(courseEditorController.editLessonNode);
router.route("/ChangeLessonNodeIndex").post(courseEditorController.changeLessonNodeIndex);

export default router;