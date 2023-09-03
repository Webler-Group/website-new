import express from "express";
import codesController from "../controllers/codesController";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";

const router = express.Router();

router.use(verifyJWT);

router.route("/")
    .get(codesController.getCodeList);
router.route("/:codeId")
    .get(codesController.getCode);
router.route("/templates/:language")
    .get(codesController.getTemplate);

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