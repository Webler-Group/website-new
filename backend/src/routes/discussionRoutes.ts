import express from "express";
import discussionController from "../controllers/discussionController";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import requestLimiter from "../middleware/requestLimiter";

const router = express.Router();

router.use(verifyJWT);

router.route("/")
    .get(discussionController.getQuestionList);
router.route("/:questionId")
    .get(discussionController.getQuestion);
router.route("/:questionId/GetReplies")
    .get(discussionController.getReplies);
router.route("/GetTags")
    .get(discussionController.getTags);
router.route("/GetCodeComments")
    .post(discussionController.getCodeComments)

router.use(protectRoute);

router.route("/CreateQuestion")
    .post(discussionController.createQuestion);
router.route("/EditQuestion")
    .put(discussionController.editQuestion);
router.route("/DeleteQuestion")
    .delete(discussionController.deleteQuestion);
router.route("/CreateReply")
    .post(discussionController.createReply);
router.route("/EditReply")
    .put(discussionController.editReply);
router.route("/DeleteReply")
    .delete(discussionController.deleteReply);
router.route("/ToggleAcceptedAnswer")
    .post(discussionController.toggleAcceptedAnswer);
router.route("/VotePost")
    .post(discussionController.votePost);
router.route("/CreateCodeComment")
    .post(requestLimiter(10 * 60, 20, "Too many requests, try again later"), discussionController.createCodeComment);
router.route("/EditCodeComment")
    .put(discussionController.editCodeComment);
router.route("/DeleteCodeComment")
    .delete(discussionController.deleteCodeComment);
router.route("/FollowQuestion")
    .post(discussionController.followQuestion)
router.route("/UnfollowQuestion")
    .post(discussionController.unfollowQuestion)

export default router;