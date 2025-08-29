"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = __importDefault(require("../controllers/adminController"));
const verifyJWT_1 = __importDefault(require("../middleware/verifyJWT"));
const protectRoute_1 = __importDefault(require("../middleware/protectRoute"));
const requireRoles_1 = __importDefault(require("../middleware/requireRoles"));
const router = (0, express_1.Router)();
router.use(verifyJWT_1.default);
router.use(protectRoute_1.default);
router.route("/BanUser").post((0, requireRoles_1.default)(["Admin", "Moderator"]), adminController_1.default.banUser);
router.route("/Users").post((0, requireRoles_1.default)(["Admin", "Moderator"]), adminController_1.default.getUsersList);
router.route("/GetUser").post((0, requireRoles_1.default)(["Admin", "Moderator"]), adminController_1.default.getUser);
router.route("/UpdateRoles").post((0, requireRoles_1.default)(["Admin"]), adminController_1.default.updateRoles);
exports.default = router;
