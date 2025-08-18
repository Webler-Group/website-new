import express from "express";
import { SitemapStream, streamToPromise } from "sitemap";
import { config } from "../confg";

const router = express.Router();

router.get("/sitemap.xml", async (req, res) => {
    try {
        res.header("Content-Type", "application/xml");

        const smStream = new SitemapStream({ hostname: config.allowedOrigins[0] });

        const staticRoutes = [
            { url: "/", changefreq: "daily", priority: 1.0 },                         // homepage
            { url: "/Users/Login", changefreq: "yearly", priority: 0.1 },            // login page
            { url: "/Users/Register", changefreq: "yearly", priority: 0.1 },         // registration
            { url: "/Users/Forgot-Password", changefreq: "yearly", priority: 0.1 },
            { url: "/Users/Reset-Password", changefreq: "yearly", priority: 0.1 },
            { url: "/Users/Activate", changefreq: "yearly", priority: 0.1 },
            
            { url: "/Terms-of-use", changefreq: "yearly", priority: 0.2 },
            { url: "/Contact", changefreq: "yearly", priority: 0.2 },

            { url: "/Discuss", changefreq: "hourly", priority: 0.9 },                 // questions update often
            { url: "/Codes", changefreq: "daily", priority: 0.6 },                   // public code list
            { url: "/Compiler-Playground", changefreq: "monthly", priority: 0.4 },

            { url: "/Feed", changefreq: "hourly", priority: 0.9 },                   // social content
            { url: "/Blog", changefreq: "weekly", priority: 0.7 },                   // new blog entries
            { url: "/Profile", changefreq: "daily", priority: 0.6 },                 // current user's profile

            { url: "/Courses", changefreq: "weekly", priority: 0.9 },                // list of all courses
            { url: "/Courses/Editor", changefreq: "daily", priority: 0.7 },          // editor list
            { url: "/Courses/Editor/New", changefreq: "monthly", priority: 0.5 },    // create course
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
