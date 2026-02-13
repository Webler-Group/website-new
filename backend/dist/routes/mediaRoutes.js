"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/mediaRoutes.ts
const express_1 = require("express");
const mediaController_1 = __importDefault(require("../controllers/mediaController"));
const router = (0, express_1.Router)();
router.get("/files/:fileId", mediaController_1.default.getFileById);
exports.default = router;
