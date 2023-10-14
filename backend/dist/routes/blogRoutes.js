"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const blogController_1 = __importDefault(require("../controllers/blogController"));
const router = express_1.default.Router();
router.route("/")
    .get(blogController_1.default.getBlogEntries);
router.route("/:entryName")
    .get(blogController_1.default.getBlogEntry);
exports.default = router;
