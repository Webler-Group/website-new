import express from "express";
import tagController from "../controllers/tagController";
import verifyJWT from "../middleware/verifyJWT";

const router = express.Router();

router.route("/").post(tagController.getTagList);
router.route("/GetTag").post(tagController.getTag);
router.route("/ExecuteJobs").post(verifyJWT, tagController.executeTagJobs);


export default router;
