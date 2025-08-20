"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tagController_1 = __importDefault(require("../controllers/tagController"));
const router = express_1.default.Router();
router.route("/")
    .post(tagController_1.default.getTagList);
router.route("/GetTag")
    .post(tagController_1.default.getTag);
exports.default = router;
