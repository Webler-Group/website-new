import express from "express";
import profileController from "../controllers/profileController";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";

const router = express.Router();

router.use(verifyJWT);

router.route("/:userId")
    .get(profileController.getProfile);

router.route("/:userId/following")
    .get(profileController.getFollowing);
router.route("/:userId/followers")
    .get(profileController.getFollowers);

router.use(protectRoute);

router.route("/:userId")
    .put(profileController.updateProfile);
router.route("/ChangePassword")
    .post(profileController.changePassword);
router.route("/Follow/:userId")
    .post(profileController.follow);
router.route("/Unfollow/:userId")
    .post(profileController.unfollow);
router.route("/GetNotifications")
    .post(profileController.getNotifications)
router.route("/GetUnseenNotificationCount")
    .post(profileController.getUnseenNotificationCount)
router.route("/MarkNotificationsSeen")
    .post(profileController.markNotificationsSeen)
router.route("/MarkNotificationsClicked")
    .post(profileController.markNotificationsClicked)

export default router;