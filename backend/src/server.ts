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
import blogRoutes from "./routes/blogRoutes";
import codesRoutes from "./routes/codesRoutes";
import courseEditorRoutes from "./routes/courseEditorRoutes";
import courseRoutes from "./routes/courseRoutes";
import channelRoutes from "./routes/channelsRoutes";
import sitemapRoutes from "./routes/sitemapRoutes";
import http from "http";
import { config } from "./confg";
import { initCronJobs } from "./services/cronJobs";
import { init } from "./config/socketServer";
import { registerHandlersWS as codesRegisterHandlersWS } from "./controllers/codesController"; 
import { registerHandlersWS as channelsregisterHandlersWS } from "./controllers/channelsController";

async function main() {
    console.log("Environment:", config.nodeEnv);

    const app = express();
    const server = http.createServer(app);

    init(server, (socket) => {
        // codesRegisterHandlersWS(socket);
        channelsregisterHandlersWS(socket);
    });

    const apiPrefix = "/api";

    await connectDB();

    if (config.nodeEnv == "production") {
        initCronJobs();
    }

    app.use("/uploads", express.static(path.join(config.rootDir, "uploads")));
    app.use(logger);
    if (config.nodeEnv == "production") {
        app.use(cors(corsOptions));
    }
    app.use(express.json({ limit: "2mb" }));
    app.use(cookieParser());

    app.use(`${apiPrefix}/Auth`, authRoutes);
    app.use(`${apiPrefix}/Profile`, profileRoutes);
    app.use(`${apiPrefix}/Discussion`, discussionRoutes);
    app.use(`${apiPrefix}/Blog`, blogRoutes);
    app.use(`${apiPrefix}/Codes`, codesRoutes);
    app.use(`${apiPrefix}/CourseEditor`, courseEditorRoutes);
    app.use(`${apiPrefix}/Courses`, courseRoutes);
    app.use(`${apiPrefix}/Channels`, channelRoutes);
    app.use(`${apiPrefix}/Sitemap`, sitemapRoutes);

    app.all("*", (req, res) => {
        res.status(404).json({ message: "404 Not Found" });
    });

    app.use(errorHandler);

    server.listen(config.port, () => console.log(`Server running on port ${config.port}`));
}

main();