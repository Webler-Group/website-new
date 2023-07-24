import express from "express";
import profileController from "../controllers/profileController";
import verifyJWT from "../middleware/verifyJWT";

const router = express.Router();

router.use(verifyJWT);

router.route("/:userId")
    .get(profileController.getProfile)
    .put(profileController.updateProfile);
router.route("/:userId/following")
    .get(profileController.getFollowing);
router.route("/:userId/followers")
    .get(profileController.getFollowers);
router.route("/ChangePassword")
    .post(profileController.changePassword);
router.route("/Follow/:userId")
    .post(profileController.follow);
router.route("/Unfollow/:userId")
    .post(profileController.unfollow);

export default router;