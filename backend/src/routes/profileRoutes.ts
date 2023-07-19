import express from "express";
import profileController from "../controllers/profileController";
import verifyJWT from "../middleware/verifyJWT";

const router = express.Router();

router.route("/:userId")
    .get(profileController.getProfile)
    .put(verifyJWT, profileController.updateProfile);

export default router;