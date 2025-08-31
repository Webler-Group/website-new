"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tagController_1 = __importDefault(require("../controllers/tagController"));
const verifyJWT_1 = __importDefault(require("../middleware/verifyJWT"));
const protectRoute_1 = __importDefault(require("../middleware/protectRoute"));
const requireRoles_1 = __importDefault(require("../middleware/requireRoles"));
const router = express_1.default.Router();
router.use(verifyJWT_1.default);
router.route("/").post(tagController_1.default.getTagList);
router.route("/GetTag").post(tagController_1.default.getTag);
router.use(protectRoute_1.default);
router.route("/ExecuteJobs").post((0, requireRoles_1.default)(["Admin", "Moderator"]), tagController_1.default.executeTagJobs);
exports.default = router;
