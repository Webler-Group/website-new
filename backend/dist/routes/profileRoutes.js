"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const profileController_1 = __importDefault(require("../controllers/profileController"));
const verifyJWT_1 = __importDefault(require("../middleware/verifyJWT"));
const protectRoute_1 = __importDefault(require("../middleware/protectRoute"));
const express_1 = require("express");
const router = (0, express_1.Router)();
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
router.route("/VerifyEmailChange")
    .post(profileController_1.default.verifyEmailChange);
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
router.route("/UploadProfileAvatarImage")
    .post(profileController_1.default.avatarImageUpload.single("avatarImage"), profileController_1.default.uploadProfileAvatarImage);
router.route("/UpdateNotifications")
    .post(profileController_1.default.updateNotifications);
router.route("/Search")
    .post(profileController_1.default.searchProfiles);
exports.default = router;
