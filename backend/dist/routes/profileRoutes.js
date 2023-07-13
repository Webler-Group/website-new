"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const profileController_1 = __importDefault(require("../controllers/profileController"));
const verifyJWT_1 = __importDefault(require("../middleware/verifyJWT"));
const router = express_1.default.Router();
router.use(verifyJWT_1.default);
router.route("/:userId")
    .get(profileController_1.default.getProfile)
    .put(profileController_1.default.updateProfile);
exports.default = router;
