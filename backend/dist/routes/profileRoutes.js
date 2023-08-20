"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const profileController_1 = __importDefault(require("../controllers/profileController"));
const verifyJWT_1 = __importDefault(require("../middleware/verifyJWT"));
const protectRoute_1 = __importDefault(require("../middleware/protectRoute"));
const router = express_1.default.Router();
router.use(verifyJWT_1.default);
router.route("/:userId")
    .get(profileController_1.default.getProfile);
router.route("/:userId/following")
    .get(profileController_1.default.getFollowing);
router.route("/:userId/followers")
    .get(profileController_1.default.getFollowers);
router.use(protectRoute_1.default);
router.route("/:userId")
    .put(profileController_1.default.updateProfile);
router.route("/ChangePassword")
    .post(profileController_1.default.changePassword);
router.route("/Follow/:userId")
    .post(profileController_1.default.follow);
router.route("/Unfollow/:userId")
    .post(profileController_1.default.unfollow);
exports.default = router;
