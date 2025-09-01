import express from "express";
import feedController from "../controllers/feedController";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import requestLimiter from "../middleware/requestLimiter";
import verifyEmail from "../middleware/verifyEmail";

const router = express.Router();

router.use(verifyJWT);

router.route("/").post(feedController.getFeedList);
router.route("/GetFeed").post(feedController.getFeed);
router.route("/GetComments")
    .post(feedController.getReplies)

router.use(protectRoute);

router.route("/PinFeed").post(feedController.togglePinFeed)
router.route("/ReplyComment").post(feedController.createReply)
router.route("/CreateFeed")
    .post(verifyEmail, requestLimiter(3600, 5, "Too many requests, try again later"), feedController.createFeed);
router.route("/EditFeed")
    .put(feedController.editFeed);
router.route("/DeleteFeed")
    .delete(feedController.deleteFeed);
router.route("/ShareFeed").post(feedController.shareFeed)
router.route("/CreateComment")
    .post(verifyEmail, requestLimiter(300, 10, "Too many requests, try again later"), feedController.createReply);
router.route("/EditComment")
    .put(feedController.editReply);
router.route("/DeleteComment")
    .delete(feedController.deleteReply);
router.route("/VotePost").post(feedController.votePost)

export default router;