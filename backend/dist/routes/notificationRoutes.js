"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const verifyJWT_1 = __importDefault(require("../middleware/verifyJWT"));
const protectRoute_1 = __importDefault(require("../middleware/protectRoute"));
const notificationController_1 = __importDefault(require("../controllers/notificationController"));
const router = express_1.default.Router();
router.use(verifyJWT_1.default);
router.use((0, protectRoute_1.default)());
router.route("/GetPublicKey").post(notificationController_1.default.getPublicKey);
router.route("/Subscribe").post(notificationController_1.default.subscribe);
router.route("/Unsubscribe").post(notificationController_1.default.unsubscribe);
exports.default = router;
