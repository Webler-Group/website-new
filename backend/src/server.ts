import express from "express";
import { logEvents, logger } from "./middleware/logger";
import errorHandler from "./middleware/errorHandler";
import cookieParser from "cookie-parser";
import cors from "cors";
import corsOptions from "./config/corsOptions";
import path from "path";
import connectDB from "./config/dbConn";
import profileRoutes from "./routes/profileRoutes";
import authRoutes from "./routes/authRoutes";
import discussionRoutes from "./routes/discussionRoutes";
import feedRoutes from "./routes/feedRoutes"
import blogRoutes from "./routes/blogRoutes";
import codesRoutes from "./routes/codesRoutes";
import courseEditorRoutes from "./routes/courseEditorRoutes";
import courseRoutes from "./routes/courseRoutes";
import channelRoutes from "./routes/channelsRoutes";
import sitemapRoutes from "./routes/sitemapRoutes";
import tagRoutes from "./routes/tagRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import adminRoutes from "./routes/adminRoutes";
import http from "http";
import { config } from "./confg";
import { initCronJobs } from "./services/cronJobs";
import { init } from "./config/socketServer";
import { registerHandlersWS as channelsregisterHandlersWS } from "./controllers/channelsController";
import { initKeystore } from "./services/pushService";
import Post from "./models/Post";
import User from "./models/User";

async function main() {
    console.log("Environment:", config.nodeEnv);

    const app = express();
    const server = http.createServer(app);

    init(server, (socket) => {
        channelsregisterHandlersWS(socket);
    });

    const apiPrefix = "/api";

    await connectDB();

    // let testUser = await User.findOne({ email: "randomtest@gmail.com" })
    // if(!testUser) {
    //     testUser = await User.create({
    //         email: "randomtest@gmail.com",
    //         name: "<DD>",
    //         password: "test@12345",
    //         avatarImage: "lelouch.png",
    //         roles: ["User", "Moderator"]
    //     })
    // }

    // const pinnedPost = await Post.findOne({ isPinned: true })
    // if(!pinnedPost) {
    //     await Post.create({
    //         message: "#### Lelouch Vi Britannia commands you....to like this post! \n ![Lelouch](https://thf.bing.com/th/id/OIP.RpkXMZjpEOhO_MEdI8JhHwHaE4?w=289&h=191&c=7&r=0&o=7&cb=thfc1&dpr=1.3&pid=1.7&rm=3)",
    //         _type: 4,
    //         user: testUser._id,
    //         isPinned: true
    //     })
    // }

    await initKeystore();

    if (config.nodeEnv == "production") {
        initCronJobs();
    }

    app.use("/uploads", express.static(path.join(config.rootDir, "uploads")));
    app.use(logger);

    app.use(`${apiPrefix}/Sitemap`, sitemapRoutes);

    if (config.nodeEnv == "production") {
        app.use(cors(corsOptions));
    }
    app.use(express.json({ limit: "2mb" }));
    app.use(cookieParser());

    app.use(`${apiPrefix}/Test`, (req, res) => {
        res.send("Server is up and running");
    })
    app.use(`${apiPrefix}/Auth`, authRoutes);
    app.use(`${apiPrefix}/Profile`, profileRoutes);
    app.use(`${apiPrefix}/Discussion`, discussionRoutes);
    app.use(`${apiPrefix}/Feed`, feedRoutes);
    app.use(`${apiPrefix}/Blog`, blogRoutes);
    app.use(`${apiPrefix}/Codes`, codesRoutes);
    app.use(`${apiPrefix}/CourseEditor`, courseEditorRoutes);
    app.use(`${apiPrefix}/Courses`, courseRoutes);
    app.use(`${apiPrefix}/Channels`, channelRoutes);
    app.use(`${apiPrefix}/Tag`, tagRoutes);
    app.use(`${apiPrefix}/PushNotifications`, notificationRoutes);
    app.use(`${apiPrefix}/Admin`, adminRoutes);

    app.all("*", (req, res) => {
        res.status(404).json({ message: "404 Not Found" });
    });

    app.use(errorHandler);

    server.listen(config.port, () => console.log(`Server running on port ${config.port}`));
}

main();