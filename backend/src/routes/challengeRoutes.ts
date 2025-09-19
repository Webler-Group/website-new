import express from "express";
import ChallengeController from "../controllers/challengeController";
import protectRoute from "../middleware/protectRoute";
import RolesEnum from "../data/RolesEnum";
import requireRoles from "../middleware/requireRoles";
import verifyJWT from "../middleware/verifyJWT";

const router =  express.Router();

const allowdRoles = [RolesEnum.ADMIN, RolesEnum.CREATOR];

router.use(verifyJWT);
router.use(protectRoute);

router.route("/").post(ChallengeController.getChallengeList);
router.route("/GetChallenge").post(ChallengeController.getChallenge);
router.route("/Create").post(requireRoles(allowdRoles), ChallengeController.createChallenge);
router.route("/Update").post(requireRoles(allowdRoles), ChallengeController.editChallenge);
router.route("/GetEditInfo").post(requireRoles(allowdRoles), ChallengeController.getChallengeInfo);
router.route("/Delete").post(requireRoles(allowdRoles), ChallengeController.deleteChallenge);

export default router;
