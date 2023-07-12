import express from "express";
import usersController from "../controllers/usersController";

const router = express.Router();

router
    .route("/")
        .post(usersController.createNewUser);

export default router;