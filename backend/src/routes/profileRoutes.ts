import profileController from "../controllers/profileController";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import { Router } from "express";
import requestLimiter from "../middleware/requestLimiter";
import checkBlocked from "../middleware/checkBlocked";

const router = Router();

router.use(verifyJWT);

router.route("/GetProfile")
    .post(checkBlocked((req) => req.body.userId as string), profileController.getProfile);

router.route("/GetFollowing")
    .post(profileController.getFollowing);
router.route("/GetFollowers")
    .post(profileController.getFollowers);

router.use(protectRoute);

router.route("/UpdateProfile")
    .put(profileController.updateProfile);
router.route("/ChangeEmail")
    .post(profileController.changeEmail);
router.route("/VerifyEmailChange")
    .post(profileController.verifyEmailChange);
router.route("/Follow")
    .post(profileController.follow);
router.route("/Unfollow")
    .post(profileController.unfollow);
router.route("/GetNotifications")
    .post(profileController.getNotifications)
router.route("/GetUnseenNotificationCount")
    .post(profileController.getUnseenNotificationCount)
router.route("/MarkNotificationsClicked")
    .post(profileController.markNotificationsClicked)
router.route("/SendActivationCode")
    .post(profileController.sendActivationCode)
router.route("/UploadProfileAvatarImage")
    .post(requestLimiter(3600 * 24, 5, "Too many requests, try again later"),
        profileController.avatarImageUploadMiddleware.single("avatarImage"),
        profileController.uploadProfileAvatarImage);
router.route("/RemoveProfileAvatarImage")
    .post(profileController.removeProfileAvatarImage);
router.route("/UpdateNotifications")
    .post(profileController.updateNotifications);
router.route("/Search")
    .post(profileController.searchProfiles);
router.route("/UploadImageFile")
    .post(requestLimiter(3600 * 24, 5, "Too many requests, try again later"),
        profileController.postImageUploadMiddleware.single("image"),
        profileController.uploadPostImage);
router.route("/GetFileEntryList")
    .post(profileController.getPostImageList);
router.route("/DeleteFileEntry")
    .delete(profileController.deletePostImage);
router.route("/CreateFolder")
    .post(profileController.createPostImageFolder);
router.route("/MoveFileEntry")
    .post(profileController.movePostImage);

export default router;