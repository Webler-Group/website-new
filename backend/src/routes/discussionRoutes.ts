import express from "express";
import discussionController from "../controllers/discussionController";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import requestLimiter from "../middleware/requestLimiter";
import verifyEmail from "../middleware/verifyEmail";

const router = express.Router();

router.use(verifyJWT);

router.route("/")
    .post(discussionController.getQuestionList);
router.route("/GetQuestion")
    .post(discussionController.getQuestion);
router.route("/GetQuestionReplies")
    .post(discussionController.getReplies);
router.route("/GetVoters")
    .post(discussionController.getVotersList);

router.use(protectRoute);

router.route("/CreateQuestion")
    .post(verifyEmail, requestLimiter(3600, 5, "Too many requests, try again later"), discussionController.createQuestion);
router.route("/EditQuestion")
    .put(discussionController.editQuestion);
router.route("/DeleteQuestion")
    .delete(discussionController.deleteQuestion);
router.route("/CreateReply")
    .post(verifyEmail, requestLimiter(300, 10, "Too many requests, try again later"), discussionController.createReply);
router.route("/EditReply")
    .put(discussionController.editReply);
router.route("/DeleteReply")
    .delete(discussionController.deleteReply);
router.route("/ToggleAcceptedAnswer")
    .post(discussionController.toggleAcceptedAnswer);
router.route("/VotePost")
    .post(verifyEmail, discussionController.votePost);
router.route("/FollowQuestion")
    .post(discussionController.followQuestion)
router.route("/UnfollowQuestion")
    .post(discussionController.unfollowQuestion)

export default router;