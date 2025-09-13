import express from "express";
import authController from "../controllers/authController";
import requestLimiter from "../middleware/requestLimiter";
import { validate } from "../middleware/validation";
import { loginSchema, registerSchema, sendPasswordResetCodeSchema, resetPasswordSchema, verifyEmailSchema } from "../validation/auth.zod";

const router = express.Router();

router.route("/Login")
    .post(validate(loginSchema), requestLimiter(60, 5, "Too many login attempts, try again later"), authController.login);

router.route("/Register")
    .post(validate(registerSchema), authController.register);

router.route("/Logout")
    .post(authController.logout);

router.route("/Refresh")
    .post(authController.refresh);

router.route("/SendPasswordResetCode")
    .post(validate(sendPasswordResetCodeSchema), authController.sendPasswordResetCode);

router.route("/ResetPassword")
    .post(validate(resetPasswordSchema), authController.resetPassword);

router.route("/GenerateCaptcha")
    .post(authController.generateCaptcha);

router.route("/Activate")
    .post(validate(verifyEmailSchema), authController.verifyEmail);

export default router;