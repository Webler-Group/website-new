"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const profileController_1 = __importDefault(require("../controllers/profileController"));
const verifyJWT_1 = __importDefault(require("../middleware/verifyJWT"));
const protectRoute_1 = __importDefault(require("../middleware/protectRoute"));
const requireRoles_1 = __importDefault(require("../middleware/requireRoles"));
const router = express_1.default.Router();
router.use(verifyJWT_1.default);
router.route("/GetProfile")
    .post(profileController_1.default.getProfile);
router.route("/GetFollowing")
    .post(profileController_1.default.getFollowing);
router.route("/GetFollowers")
    .post(profileController_1.default.getFollowers);
router.use(protectRoute_1.default);
router.route("/UpdateProfile")
    .put(profileController_1.default.updateProfile);
router.route("/ChangeEmail")
    .post(profileController_1.default.changeEmail);
router.route("/ChangePassword")
    .post(profileController_1.default.changePassword);
router.route("/Follow")
    .post(profileController_1.default.follow);
router.route("/Unfollow")
    .post(profileController_1.default.unfollow);
router.route("/GetNotifications")
    .post(profileController_1.default.getNotifications);
router.route("/GetUnseenNotificationCount")
    .post(profileController_1.default.getUnseenNotificationCount);
router.route("/MarkNotificationsSeen")
    .post(profileController_1.default.markNotificationsSeen);
router.route("/MarkNotificationsClicked")
    .post(profileController_1.default.markNotificationsClicked);
router.route("/SendActivationCode")
    .post(profileController_1.default.sendActivationCode);
router.route("/ToggleUserBan")
    .post((0, requireRoles_1.default)(["Moderator", "Admin"]), profileController_1.default.toggleUserBan); // TODO: Move to Admin routes
router.route("/UploadProfileAvatarImage")
    .post(profileController_1.default.avatarImageUpload.single("avatarImage"), profileController_1.default.uploadProfileAvatarImage);
router.route("/UpdateNotifications")
    .post(profileController_1.default.updateNotifications);
exports.default = router;
