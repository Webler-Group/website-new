import express from "express";
import feedController from "../controllers/feedController";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import requestLimiter from "../middleware/requestLimiter";
import verifyEmail from "../middleware/verifyEmail";

const router = express.Router();

// router.use(verifyJWT);

router.route("/")
    .post(feedController.getFeedList);
router.route("/GetFeed")
    .post(feedController.getFeed);
router.route("/GetFeedReplies")
    .post(feedController.getReplies);

// router.use(protectRoute);

router.route("/PinFeed").post(feedController.togglePinFeed)

router.route("/CreateFeed")
    .post(verifyEmail, requestLimiter(3600, 5, "Too many requests, try again later"), feedController.createFeed);
router.route("/EditFeed")
    .put(feedController.editFeed);
router.route("/DeleteFeed")
    .delete(feedController.deleteFeed);
router.route("/CreateReply")
    .post(verifyEmail, requestLimiter(300, 10, "Too many requests, try again later"), feedController.createReply);
router.route("/EditReply")
    .put(feedController.editReply);
router.route("/DeleteReply")
    .delete(feedController.deleteReply);
router.route("/ToggleAcceptedAnswer")
    .post(feedController.toggleAcceptedAnswer);
router.route("/VotePost")
    .post(verifyEmail, feedController.votePost);

router.route("/FollowFeed")
    .post(feedController.followFeed)
router.route("/UnfollowFeed")
    .post(feedController.unfollowFeed)


router.route("/ShareFeed").post(feedController.shareFeed)

export default router;