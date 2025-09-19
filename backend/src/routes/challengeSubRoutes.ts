import express from "express";
import protectRoute from "../middleware/protectRoute";
import verifyJWT from "../middleware/verifyJWT";
import ChallengeSubController from "../controllers/challengeSubController";

const router =  express.Router();

router.use(verifyJWT);
router.use(protectRoute);

// router.route("/").post(ChallengeController.getChallengeList);
router.route("/AddEntry").post(ChallengeSubController.createChallengeSubmission);
router.route("/GetEntry").post(ChallengeSubController.getChallengeSubmissionTemplate);
router.route("/DeleteEntry").post(ChallengeSubController.deleteChallengeSubmission);
router.route("/UpdateEntryStatus").post(ChallengeSubController.updateSubmissionStatus);

export default router;
