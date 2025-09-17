"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const feedController_1 = __importDefault(require("../controllers/feedController"));
const verifyJWT_1 = __importDefault(require("../middleware/verifyJWT"));
const protectRoute_1 = __importDefault(require("../middleware/protectRoute"));
const requestLimiter_1 = __importDefault(require("../middleware/requestLimiter"));
const verifyEmail_1 = __importDefault(require("../middleware/verifyEmail"));
const RolesEnum_1 = __importDefault(require("../data/RolesEnum"));
const requireRoles_1 = __importDefault(require("../middleware/requireRoles"));
const router = express_1.default.Router();
router.use(verifyJWT_1.default);
router.route("/").post(feedController_1.default.getFeedList);
router.route("/GetFeed").post(feedController_1.default.getFeed);
router.route("/GetComments").post(feedController_1.default.getReplies);
router.route("/GetReactions").post(feedController_1.default.getReactions);
router.route("/GetUserReactions").post(feedController_1.default.getUserReactions);
router.use(protectRoute_1.default);
router.route("/PinFeed").post((0, requireRoles_1.default)([RolesEnum_1.default.ADMIN, RolesEnum_1.default.MODERATOR]), feedController_1.default.togglePinFeed);
router.route("/ReplyComment").post(feedController_1.default.createReply);
router.route("/CreateFeed")
    .post(verifyEmail_1.default, (0, requestLimiter_1.default)(3600, 5, "Too many requests, try again later"), feedController_1.default.createFeed);
router.route("/EditFeed")
    .put(feedController_1.default.editFeed);
router.route("/DeleteFeed")
    .delete(feedController_1.default.deleteFeed);
router.route("/ShareFeed").post(feedController_1.default.shareFeed);
router.route("/CreateComment")
    .post(verifyEmail_1.default, (0, requestLimiter_1.default)(300, 10, "Too many requests, try again later"), feedController_1.default.createReply);
router.route("/EditComment")
    .put(feedController_1.default.editReply);
router.route("/DeleteComment")
    .delete(feedController_1.default.deleteReply);
router.route("/VotePost").post(verifyEmail_1.default, feedController_1.default.votePost);
exports.default = router;
