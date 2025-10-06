import express from "express";
import ChallengeController from "../controllers/challengeController";
import protectRoute from "../middleware/protectRoute";
import RolesEnum from "../data/RolesEnum";
import requireRoles from "../middleware/requireRoles";
import verifyJWT from "../middleware/verifyJWT";

const router =  express.Router();

router.use(verifyJWT);

router.route("/").post(ChallengeController.getChallengeList);

router.use(protectRoute);

router.route("/GetChallenge").post(ChallengeController.getChallenge);

router.use(requireRoles([RolesEnum.ADMIN, RolesEnum.CREATOR]));

router.route("/GetUpdatedChallenge").post(ChallengeController.getEditedChallenge);
router.route("/Create").post(ChallengeController.createChallenge);
router.route("/Update").post(ChallengeController.editChallenge);
router.route("/Delete").post(ChallengeController.deleteChallenge);

export default router;
