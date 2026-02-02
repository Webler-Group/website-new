import verifyJWT from "../middleware/verifyJWT";
import courseEditorController from "../controllers/courseEditorController";
import protectRoute from "../middleware/protectRoute";
import requireRoles from "../middleware/requireRoles";
import { Router } from "express";
import RolesEnum from "../data/RolesEnum";

const router = Router();

router.use(verifyJWT);

router.use(protectRoute);
router.use(requireRoles([RolesEnum.ADMIN, RolesEnum.CREATOR]))

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

router.route("/ExportCourseLesson").post(courseEditorController.exportCourseLesson);

export default router;