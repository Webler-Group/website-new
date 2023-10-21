import express from "express";
import codesController from "../controllers/codesController";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";

const router = express.Router();

router.use(verifyJWT);

router.route("/")
    .post(codesController.getCodeList);
router.route("/GetCode")
    .post(codesController.getCode);
router.route("/templates/:language")
    .post(codesController.getTemplate);
router.route("/Compile")
    .post(codesController.compile);

router.use(protectRoute);

router.route("/CreateCode")
    .post(codesController.createCode);
router.route("/EditCode")
    .put(codesController.editCode);
router.route("/DeleteCode")
    .delete(codesController.deleteCode);
router.route("/VoteCode")
    .post(codesController.voteCode);

export default router;
