import express from "express";
import ChallengeController from "../controllers/challengeController";
import protectRoute from "../middleware/protectRoute";
import RolesEnum from "../data/RolesEnum";
import requireRoles from "../middleware/requireRoles";
import verifyJWT from "../middleware/verifyJWT";
import requestLimiter from "../middleware/requestLimiter";

const router =  express.Router();

router.use(verifyJWT);

router.route("/").post(ChallengeController.getChallengeList);
router.route("/Collections").post(ChallengeController.getCollectionList);
router.route("/Tags").post(ChallengeController.getChallengeTags);
router.route("/GetCollection").post(ChallengeController.getCollection);

router.use(protectRoute);

router.route("/GetChallenge").post(ChallengeController.getChallenge);
router.route("/GetChallengeCode").post(ChallengeController.getChallengeCode);
router.route("/SaveChallengeCode").post(ChallengeController.saveChallengeCode);
router.route("/CreateChallengeJob").post(requestLimiter(60, 10, "Too many requests, try again later"), ChallengeController.createChallengeJob);
router.route("/GetChallengeJob").post(ChallengeController.getChallengeJob);
router.route("/UnlockSolution").post(ChallengeController.unlockChallengeSolution);

router.use(requireRoles([RolesEnum.ADMIN, RolesEnum.CREATOR]));

router.route("/GetUpdatedChallenge").post(ChallengeController.getEditedChallenge);
router.route("/Create").post(ChallengeController.createChallenge);
router.route("/Import").post(ChallengeController.importUploadMiddleware.single("file"), ChallengeController.importChallenges);
router.route("/Update").post(ChallengeController.editChallenge);
router.route("/Delete").post(ChallengeController.deleteChallenge);
router.route("/Search").post(ChallengeController.searchChallenges);
router.route("/CreateCollection").post(ChallengeController.createCollection);
router.route("/UpdateCollection").post(ChallengeController.editCollection);
router.route("/DeleteCollection").post(ChallengeController.deleteCollection);

export default router;
