"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const codesController_1 = __importDefault(require("../controllers/codesController"));
const verifyJWT_1 = __importDefault(require("../middleware/verifyJWT"));
const protectRoute_1 = __importDefault(require("../middleware/protectRoute"));
const verifyEmail_1 = __importDefault(require("../middleware/verifyEmail"));
const router = express_1.default.Router();
router.use(verifyJWT_1.default);
router.route("/")
    .post(codesController_1.default.getCodeList);
router.route("/GetCode")
    .post(codesController_1.default.getCode);
router.route("/templates/:language")
    .post(codesController_1.default.getTemplate);
router.route("/CreateJob")
    .post(codesController_1.default.createJob);
router.route("/GetJob")
    .post(codesController_1.default.getJob);
router.use(protectRoute_1.default);
router.route("/CreateCode")
    .post(verifyEmail_1.default, codesController_1.default.createCode);
router.route("/EditCode")
    .put(codesController_1.default.editCode);
router.route("/DeleteCode")
    .delete(codesController_1.default.deleteCode);
router.route("/VoteCode")
    .post(verifyEmail_1.default, codesController_1.default.voteCode);
exports.default = router;
