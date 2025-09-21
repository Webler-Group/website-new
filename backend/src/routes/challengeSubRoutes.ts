import express from "express";
import protectRoute from "../middleware/protectRoute";
import verifyJWT from "../middleware/verifyJWT";
import ChallengeSubController from "../controllers/challengeSubController";

const router =  express.Router();

router.use(verifyJWT);
router.use(protectRoute);

// router.route("/").post(ChallengeController.getChallengeList);
router.route("/AddEntry").post(ChallengeSubController.createChallengeSubmission);
// @todo: add a request limiter to CreateEntryJob
router.route("/CreateEntryJob").post(ChallengeSubController.submitChallengeJob);
router.route("/GetEntry").post(ChallengeSubController.getChallengeSubmissionTemplate);
router.route("/DeleteEntry").post(ChallengeSubController.deleteChallengeSubmission);
router.route("/UpdateEntryStatus").post(ChallengeSubController.updateSubmissionStatus);

export default router;
