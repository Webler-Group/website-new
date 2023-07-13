"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = __importDefault(require("../controllers/authController"));
const loginLimiter_1 = __importDefault(require("../middleware/loginLimiter"));
const router = express_1.default.Router();
router.route("/Login")
    .post(loginLimiter_1.default, authController_1.default.login);
router.route("/Register")
    .post(authController_1.default.register);
router.route("/Logout")
    .post(authController_1.default.logout);
router.route("/Refresh")
    .get(authController_1.default.refresh);
exports.default = router;
