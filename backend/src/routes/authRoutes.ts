import express from "express";
import authController from "../controllers/authController";
import loginLimiter from "../middleware/loginLimiter";

const router = express.Router();

router.route("/Login")
    .post(loginLimiter, authController.login);

router.route("/Register")
    .post(authController.register);

router.route("/Logout")
    .post(authController.logout);

router.route("/Refresh")
    .get(authController.refresh);

export default router;