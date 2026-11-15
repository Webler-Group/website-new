import express from "express";
import { logger } from "./middleware/logger";
import errorHandler from "./middleware/errorHandler";
import cookieParser from "cookie-parser";
import cors from "cors";
import corsOptions from "./config/corsOptions";
import connectDB from "./config/dbConn";
import profileRoutes from "./routes/profileRoutes";
import authRoutes from "./routes/authRoutes";
import discussionRoutes from "./routes/discussionRoutes";
import feedRoutes from "./routes/feedRoutes"
import codesRoutes from "./routes/codesRoutes";
import courseEditorRoutes from "./routes/courseEditorRoutes";
import courseRoutes from "./routes/courseRoutes";
import channelRoutes from "./routes/channelsRoutes";
import sitemapRoutes from "./routes/sitemapRoutes";
import challengeRoutes from "./routes/challengeRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import adminRoutes from "./routes/adminRoutes";
import http from "http";
import { config } from "./confg";
import { init } from "./config/socketServer";
import { registerHandlersWS as channelsregisterHandlersWS } from "./controllers/channelsController";
import { initKeystore } from "./services/pushService";
import mediaRoutes from "./routes/mediaRoutes";

async function main() {
    console.log("Environment:", config.nodeEnv);

    const app = express();
    // nginx runs on the same host and is the only proxy we trust. It sets X-Forwarded-For to the
    // real client IP (resolved from Cloudflare's CF-Connecting-IP by the realip module), so req.ip
    // is that IP. Requests that don't come from loopback (e.g. hitting :5500 directly) get the socket
    // address, and any forwarding headers they send are ignored.
    app.set("trust proxy", "loopback");
    const server = http.createServer(app);

    init(server, (socket) => {
        channelsregisterHandlersWS(socket);
    });

    const apiPrefix = "/api";

    await connectDB();

    await initKeystore();

    app.use("/media", mediaRoutes);

    app.use(`${apiPrefix}/Sitemap`, sitemapRoutes);

    if (config.nodeEnv == "production") {
        app.use(cors(corsOptions));
    }
    app.use(express.json({ limit: "2mb" }));
    app.use(cookieParser());

    app.use(logger);

    app.use(`${apiPrefix}/Test`, (req, res) => {
        res.send("Server is up and running");
    })
    app.use(`${apiPrefix}/Auth`, authRoutes);
    app.use(`${apiPrefix}/Profile`, profileRoutes);
    app.use(`${apiPrefix}/Discussion`, discussionRoutes);
    app.use(`${apiPrefix}/Feed`, feedRoutes);
    app.use(`${apiPrefix}/Codes`, codesRoutes);
    app.use(`${apiPrefix}/CourseEditor`, courseEditorRoutes);
    app.use(`${apiPrefix}/Courses`, courseRoutes);
    app.use(`${apiPrefix}/Channels`, channelRoutes);
    app.use(`${apiPrefix}/Challenge`, challengeRoutes);
    app.use(`${apiPrefix}/PushNotifications`, notificationRoutes);
    app.use(`${apiPrefix}/Admin`, adminRoutes);

    app.use((req, res) => {
        res.status(404).json({ success: false, error: [{ message: "resource not found" }] });
    });

    app.use(errorHandler);

    server.listen(config.port, () => console.log(`Server running on port ${config.port}`));
}

main();