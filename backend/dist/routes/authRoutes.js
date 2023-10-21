"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = __importDefault(require("../controllers/authController"));
const requestLimiter_1 = __importDefault(require("../middleware/requestLimiter"));
const router = express_1.default.Router();
router.route("/Login")
    .post((0, requestLimiter_1.default)(60, 5, "Too many login attempts, try again later"), authController_1.default.login);
router.route("/Register")
    .post(authController_1.default.register);
router.route("/Logout")
    .post(authController_1.default.logout);
router.route("/Refresh")
    .post(authController_1.default.refresh);
router.route("/SendPasswordResetCode")
    .post((0, requestLimiter_1.default)(60 * 10, 2, "Too many requests, try again later"), authController_1.default.sendPasswordResetCode);
router.route("/ResetPassword")
    .post(authController_1.default.resetPassword);
router.route("/GenerateCaptcha")
    .post(authController_1.default.generateCaptcha);
exports.default = router;
