"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const verifyJWT_1 = __importDefault(require("../middleware/verifyJWT"));
const courseEditorController_1 = __importStar(require("../controllers/courseEditorController"));
const router = express_1.default.Router();
router.use(verifyJWT_1.default);
router.route("/").post(courseEditorController_1.default.getCoursesList);
router.route("/GetCourse").post(courseEditorController_1.default.getCourse);
router.route("/CreateCourse").post(courseEditorController_1.default.createCourse);
router.route("/EditCourse").put(courseEditorController_1.default.editCourse);
router.route("/DeleteCourse").delete(courseEditorController_1.default.deleteCourse);
router.route("/UploadCourseCoverImage").post(courseEditorController_1.coverImageUpload.single("coverImage"), courseEditorController_1.default.uploadCourseCoverImage);
router.route("/GetLesson").post(courseEditorController_1.default.getLesson);
router.route("/CreateLesson").post(courseEditorController_1.default.createLesson);
router.route("/GetLessonList").post(courseEditorController_1.default.getLessonList);
router.route("/EditLesson").put(courseEditorController_1.default.editLesson);
router.route("/DeleteLesson").delete(courseEditorController_1.default.deleteLesson);
router.route("/GetLessonNode").post(courseEditorController_1.default.getLessonNode);
router.route("/CreateLessonNode").post(courseEditorController_1.default.createLessonNode);
router.route("/DeleteLessonNode").delete(courseEditorController_1.default.deleteLessonNode);
router.route("/EditLessonNode").put(courseEditorController_1.default.editLessonNode);
router.route("/ChangeLessonNodeIndex").post(courseEditorController_1.default.changeLessonNodeIndex);
exports.default = router;
