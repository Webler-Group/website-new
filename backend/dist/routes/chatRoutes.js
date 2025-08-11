"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelRoutes = void 0;
const express_1 = __importDefault(require("express"));
const chatController_1 = require("../controllers/chatController");
const verifyJWT_1 = __importDefault(require("../middleware/verifyJWT"));
const router = express_1.default.Router();
exports.channelRoutes = router;
router.use(verifyJWT_1.default);
router.route("/").post(chatController_1.getChannelsList);
router.route("/getChannelMessages").post(chatController_1.getChannelMessages);
router.route("/sendChannelMessage").post(chatController_1.sendChannelMessage);
router.route("/createDirect").post(chatController_1.createDirect);
router.route("/createGroupChat").post(chatController_1.createGroupChat);
