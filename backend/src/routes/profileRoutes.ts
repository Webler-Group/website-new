import express from "express";
import profileController from "../controllers/profileController";
import verifyJWT from "../middleware/verifyJWT";

const router = express.Router();

router.use(verifyJWT);

router.route("/GetProfile")
    .post(profileController.getProfile);

export default router;