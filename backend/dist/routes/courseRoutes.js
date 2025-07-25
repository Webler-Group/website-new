"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const verifyJWT_1 = __importDefault(require("../middleware/verifyJWT"));
const courseController_1 = __importDefault(require("../controllers/courseController"));
const protectRoute_1 = __importDefault(require("../middleware/protectRoute"));
const router = express_1.default.Router();
router.use(verifyJWT_1.default);
router.route("/").post(courseController_1.default.getCourseList);
router.route("/GetUserCourses").post(courseController_1.default.getUserCourseList);
router.route("/GetCourse").post(courseController_1.default.getCourse);
router.route("/GetLesson").post(courseController_1.default.getLesson);
router.route("/GetLessonNode").post(courseController_1.default.getLessonNode);
router.route("/SolveNode").post(courseController_1.default.solve);
router.route("/ResetCourseProgress").post(courseController_1.default.resetCourseProgress);
router.use(protectRoute_1.default);
exports.default = router;
