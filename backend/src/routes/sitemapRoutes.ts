import express from "express";
import { SitemapStream, streamToPromise } from "sitemap";

const router = express.Router();

router.get("/sitemap.xml", async (req, res) => {
    try {
        res.header("Content-Type", "application/xml");

        const smStream = new SitemapStream({ hostname: "https://www.weblercodes.com/" });

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
        const sitemapXml = await streamToPromise(smStream);
        res.send(sitemapXml.toString());

    } catch (err) {
        console.error("Sitemap generation error:", err);
        res.status(500).end();
    }
});

export default router;
