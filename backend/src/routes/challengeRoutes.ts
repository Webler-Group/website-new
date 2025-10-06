import express from "express";
import ChallengeController from "../controllers/challengeController";
import protectRoute from "../middleware/protectRoute";
import RolesEnum from "../data/RolesEnum";
import requireRoles from "../middleware/requireRoles";
import verifyJWT from "../middleware/verifyJWT";

const router =  express.Router();

const allowedRoles = [RolesEnum.ADMIN, RolesEnum.CREATOR];

router.use(verifyJWT);

router.route("/").post(ChallengeController.getChallengeList);

router.use(protectRoute);

router.route("/GetChallenge").post(ChallengeController.getChallenge);
router.route("/Create").post(requireRoles(allowedRoles), ChallengeController.createChallenge);
router.route("/Update").post(requireRoles(allowedRoles), ChallengeController.editChallenge);
router.route("/GetEditInfo").post(requireRoles(allowedRoles), ChallengeController.getChallengeInfo);
router.route("/Delete").post(requireRoles(allowedRoles), ChallengeController.deleteChallenge);

export default router;
