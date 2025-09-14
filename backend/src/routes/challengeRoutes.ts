import express from "express";
import ChallengeController from "../controllers/challengeController";
import protectRoute from "../middleware/protectRoute";
import RolesEnum from "../data/RolesEnum";
import requireRoles from "../middleware/requireRoles";

const router =  express.Router();

// router.use(protectRoute);

router.route("/").post(ChallengeController.getChallengeList);
router.route("/GetChallenge").post(ChallengeController.getChallenge);
router.route("/Create").post(ChallengeController.createChallenge);

// router.get("/challenges/search", ChallengeController.searchByTag);

// // Submission routes
// router.post("/submissions", SubmissionController.createSubmission);
// router.get("/submissions/challenge/:challengeId", SubmissionController.getSubmissionsByChallenge);
// router.get("/submissions/user/:userId", SubmissionController.getSubmissionsByUser);
// router.patch("/submissions/:id", SubmissionController.updateSubmissionStatus);

export default router;
