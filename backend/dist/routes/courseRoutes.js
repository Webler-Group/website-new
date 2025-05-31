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
router.route("/")
    .post(courseController_1.default.getCourseList);
router.route("/GetUserCourses")
    .post(courseController_1.default.getUserCourseList);
router.use(protectRoute_1.default);
exports.default = router;
