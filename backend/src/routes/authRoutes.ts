import express from "express";
import authController from "../controllers/authController";
import requestLimiter from "../middleware/requestLimiter";

const router = express.Router();

router.route("/Login")
    .post(requestLimiter(60, 5, "Too many login attempts, try again later"), authController.login);

router.route("/Register")
    .post(authController.register);

router.route("/Logout")
    .post(authController.logout);

router.route("/Refresh")
    .post(authController.refresh);

router.route("/SendPasswordResetCode")
    .post(requestLimiter(60 * 10, 2, "Too many requests, try again later"), authController.sendPasswordResetCode);

router.route("/ResetPassword")
    .post(authController.resetPassword);

router.route("/GenerateCaptcha")
    .post(authController.generateCaptcha);

router.route("/Activate")
    .post(authController.verifyEmail);

export default router;