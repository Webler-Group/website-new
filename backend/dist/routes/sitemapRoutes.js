"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sitemap_1 = require("sitemap");
const router = express_1.default.Router();
router.get("/sitemap.xml", async (req, res) => {
    try {
        res.header("Content-Type", "application/xml");
        const smStream = new sitemap_1.SitemapStream({ hostname: "https://www.weblercodes.com/" });
        const staticRoutes = [
            { url: "/", changefreq: "daily", priority: 1.0 },
            { url: "/Discuss", changefreq: "hourly", priority: 0.9 },
            { url: "/Codes", changefreq: "hourly", priority: 0.9 },
            { url: "/Feed", changefreq: "hourly", priority: 0.9 },
            { url: "/Challenge", changefreq: "hourly", priority: 0.9 },
            { url: "/Courses", changefreq: "weekly", priority: 0.9 },
        ];
        staticRoutes.forEach(entry => smStream.write(entry));
        smStream.end();
        const sitemapXml = await (0, sitemap_1.streamToPromise)(smStream);
        res.send(sitemapXml.toString());
    }
    catch (err) {
        console.error("Sitemap generation error:", err);
        res.status(500).end();
    }
});
exports.default = router;
