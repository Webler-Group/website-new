import profileController from "../controllers/profileController";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import { Router } from "express";

const router = Router();

router.use(verifyJWT);

router.route("/GetProfile")
    .post(profileController.getProfile);

router.route("/GetFollowing")
    .post(profileController.getFollowing);
router.route("/GetFollowers")
    .post(profileController.getFollowers);

router.use(protectRoute);

router.route("/UpdateProfile")
    .put(profileController.updateProfile);
router.route("/ChangeEmail")
    .post(profileController.changeEmail);
router.route("/ChangePassword")
    .post(profileController.changePassword);
router.route("/Follow")
    .post(profileController.follow);
router.route("/Unfollow")
    .post(profileController.unfollow);
router.route("/GetNotifications")
    .post(profileController.getNotifications)
router.route("/GetUnseenNotificationCount")
    .post(profileController.getUnseenNotificationCount)
router.route("/MarkNotificationsSeen")
    .post(profileController.markNotificationsSeen)
router.route("/MarkNotificationsClicked")
    .post(profileController.markNotificationsClicked)
router.route("/SendActivationCode")
    .post(profileController.sendActivationCode)
router.route("/UploadProfileAvatarImage")
    .post(profileController.avatarImageUpload.single("avatarImage"), profileController.uploadProfileAvatarImage);
router.route("/UpdateNotifications")
    .post(profileController.updateNotifications);


export default router;