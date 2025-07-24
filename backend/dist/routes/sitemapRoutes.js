"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sitemap_1 = require("sitemap");
const confg_1 = require("../confg");
const router = express_1.default.Router();
router.get("/sitemap.xml", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.header("Content-Type", "application/xml");
        const smStream = new sitemap_1.SitemapStream({ hostname: confg_1.config.homeUrl });
        const staticRoutes = [
            { url: "/", changefreq: "daily", priority: 1.0 },
            { url: "/Users/Login", changefreq: "yearly", priority: 0.1 },
            { url: "/Users/Register", changefreq: "yearly", priority: 0.1 },
            { url: "/Users/Forgot-Password", changefreq: "yearly", priority: 0.1 },
            { url: "/Users/Reset-Password", changefreq: "yearly", priority: 0.1 },
            { url: "/Users/Activate", changefreq: "yearly", priority: 0.1 },
            { url: "/Terms-of-use", changefreq: "yearly", priority: 0.2 },
            { url: "/Contact", changefreq: "yearly", priority: 0.2 },
            { url: "/Discuss", changefreq: "hourly", priority: 0.9 },
            { url: "/Codes", changefreq: "daily", priority: 0.6 },
            { url: "/Compiler-Playground", changefreq: "monthly", priority: 0.4 },
            { url: "/Feed", changefreq: "hourly", priority: 0.9 },
            { url: "/Blog", changefreq: "weekly", priority: 0.7 },
            { url: "/Profile", changefreq: "daily", priority: 0.6 },
            { url: "/Courses", changefreq: "weekly", priority: 0.9 },
            { url: "/Courses/Editor", changefreq: "daily", priority: 0.7 },
            { url: "/Courses/Editor/New", changefreq: "monthly", priority: 0.5 }, // create course
        ];
        staticRoutes.forEach(entry => smStream.write(entry));
        smStream.end();
        const sitemapXml = yield (0, sitemap_1.streamToPromise)(smStream);
        res.send(sitemapXml.toString());
    }
    catch (err) {
        console.error("Sitemap generation error:", err);
        res.status(500).end();
    }
}));
exports.default = router;
