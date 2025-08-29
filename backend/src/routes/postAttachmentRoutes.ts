import express from "express";
import verifyJWT from "../middleware/verifyJWT";
import protectRoute from "../middleware/protectRoute";
import postAttachmentController from '../controllers/postAttachmentController'

const router = express.Router();


router.route("/GetPostAttachments").post(postAttachmentController.getAttachmentsByIds);


export default router;
