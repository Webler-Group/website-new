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
import http from "http";
import { config } from "./confg";
import { initCronJobs } from "./services/cronJobs";

async function main() {
    console.log(config.nodeEnv);

    const app = express();
    const server = http.createServer(app);

    const apiPrefix = "/api";

    // const wss = new WebSocket.Server({ server });

    // wss.on("connection", (ws) => {
    //     console.log("A new client connected!");
    //     ws.send("Welcome New Client!");
    // })

    await connectDB();

    initCronJobs();

    app.use("/uploads", express.static(path.join(config.rootDir, "uploads")));
    app.use(logger);
    if(config.nodeEnv == "production") {
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

    app.all("*", (req, res) => {
        res.status(404).json({ message: "404 Not Found" });
    });

    app.use(errorHandler);

    app.listen(config.port, () => console.log(`Server running on port ${config.port}`));
}

main();