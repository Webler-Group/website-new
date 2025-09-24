import express from "express";
import protectRoute from "../middleware/protectRoute";
import verifyJWT from "../middleware/verifyJWT";
import ChallengeSubController from "../controllers/challengeSubController";

const router =  express.Router();

router.use(verifyJWT);
router.use(protectRoute);

// submission route does not need a delete path. A submission can only be deleted if
// parent challenge get deleted. 
// moreover users can add many submission in different languages
// however, they can only add one submission per language. This implies that no two or more submission
// from the same users can ever be of the same language

router.route("/AddOrUpdateEntry").post(ChallengeSubController.createOrUpdateSubmission);
router.route("/GetEntry").post(ChallengeSubController.getChallengeSubmissionTemplate);
router.route("/CreateEntryJob").post(ChallengeSubController.submitChallengeJob);

export default router;
