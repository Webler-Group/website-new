import express from "express";
import { EnumChangefreq, SitemapItemLoose, SitemapStream, streamToPromise } from "sitemap";
import PostModel from "../models/Post";
import PostTypeEnum from "../data/PostTypeEnum";
import CodeModel from "../models/Code";
import ChallengeCollectionModel from "../models/ChallengeCollection";
import UserModel from "../models/User";
import CompilerLanguagesEnum from "../data/CompilerLanguagesEnum";

const router = express.Router();

const HOSTNAME = "https://www.weblercodes.com/";
// The sitemap protocol allows at most 50,000 URLs per file
const MAX_URLS = 50_000;
const CACHE_TTL_MS = 60 * 60 * 1000;

// Public pages only: anything behind login or marked noindex on the frontend doesn't belong here
const staticRoutes: SitemapItemLoose[] = [
    { url: "/", changefreq: EnumChangefreq.DAILY, priority: 1.0 },
    { url: "/Discuss", changefreq: EnumChangefreq.HOURLY, priority: 0.9 },
    { url: "/Codes", changefreq: EnumChangefreq.HOURLY, priority: 0.9 },
    { url: "/Feed", changefreq: EnumChangefreq.HOURLY, priority: 0.8 },
    { url: "/Challenge", changefreq: EnumChangefreq.DAILY, priority: 0.9 },
    { url: "/Courses", changefreq: EnumChangefreq.WEEKLY, priority: 0.9 },
    { url: "/Compiler-Playground", changefreq: EnumChangefreq.MONTHLY, priority: 0.9 },
    ...Object.values(CompilerLanguagesEnum).map(lang => ({
        url: `/Compiler-Playground/${lang}`, changefreq: EnumChangefreq.MONTHLY, priority: 0.8
    })),
    { url: "/Profile/Leaderboard", changefreq: EnumChangefreq.DAILY, priority: 0.6 },
    { url: "/Faq", changefreq: EnumChangefreq.MONTHLY, priority: 0.5 },
    { url: "/Contact", changefreq: EnumChangefreq.YEARLY, priority: 0.3 },
    { url: "/Terms-of-use", changefreq: EnumChangefreq.YEARLY, priority: 0.3 },
    { url: "/Users/Register", changefreq: EnumChangefreq.YEARLY, priority: 0.5 },
];

type DatedDoc = { _id: unknown; updatedAt?: Date; createdAt?: Date };

const toItems = (docs: DatedDoc[], prefix: string, priority: number): SitemapItemLoose[] =>
    docs.map(doc => ({
        url: `${prefix}/${doc._id}`,
        lastmod: (doc.updatedAt ?? doc.createdAt)?.toISOString(),
        priority
    }));

const buildSitemap = async () => {
    let remaining = MAX_URLS - staticRoutes.length;
    const take = (n: number) => Math.max(0, Math.min(n, remaining));

    const collections = await ChallengeCollectionModel
        .find({ isPublic: true }, { updatedAt: 1, createdAt: 1 })
        .sort({ updatedAt: -1 }).limit(take(1000)).lean();
    remaining -= collections.length;

    const questions = await PostModel
        .find({ _type: PostTypeEnum.QUESTION, hidden: false }, { updatedAt: 1, createdAt: 1 })
        .sort({ updatedAt: -1 }).limit(take(25_000)).lean();
    remaining -= questions.length;

    const codes = await CodeModel
        .find({ isPublic: true, hidden: false }, { updatedAt: 1, createdAt: 1 })
        .sort({ updatedAt: -1 }).limit(take(15_000)).lean();
    remaining -= codes.length;

    // Only profiles with some activity; empty profiles are thin content
    const users = await UserModel
        .find({ active: true, xp: { $gt: 0 } }, { updatedAt: 1, createdAt: 1 })
        .sort({ xp: -1 }).limit(take(remaining)).lean();

    const smStream = new SitemapStream({ hostname: HOSTNAME });
    [
        ...staticRoutes,
        ...toItems(collections, "/Challenge/Collection", 0.7),
        ...toItems(questions, "/Discuss", 0.7),
        ...toItems(codes, "/Compiler-Playground", 0.6),
        ...toItems(users, "/Profile", 0.4),
    ].forEach(item => smStream.write(item));
    smStream.end();

    return (await streamToPromise(smStream)).toString();
};

let cache: { xml: string; expiresAt: number } | null = null;
let pending: Promise<string> | null = null;

const getSitemap = async () => {
    if (cache && cache.expiresAt > Date.now()) return cache.xml;
    // Concurrent requests share one build instead of each hitting the DB
    pending ??= buildSitemap()
        .then(xml => {
            cache = { xml, expiresAt: Date.now() + CACHE_TTL_MS };
            return xml;
        })
        .finally(() => { pending = null; });
    return pending;
};

router.get("/sitemap.xml", async (req, res) => {
    try {
        const xml = await getSitemap();
        res.header("Content-Type", "application/xml");
        res.header("Cache-Control", "public, max-age=3600");
        res.send(xml);
    } catch (err) {
        console.log("Sitemap generation error:", err);
        // Serve a stale sitemap rather than an error if we have one
        if (cache) {
            res.header("Content-Type", "application/xml");
            res.send(cache.xml);
            return;
        }
        res.status(500).end();
    }
});

export default router;
