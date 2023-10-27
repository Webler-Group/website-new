import express from "express";
import dotenv from "dotenv";
dotenv.config();
import { logEvents, logger } from "./middleware/logger";
import errorHandler from "./middleware/errorHandler";
import cookieParser from "cookie-parser";
import cors from "cors";
import corsOptions from "./config/corsOptions";
import path from "path";
import connectDB from "./config/dbConn";
import mongoose from "mongoose";
import profileRoutes from "./routes/profileRoutes";
import authRoutes from "./routes/authRoutes";
import discussionRoutes from "./routes/discussionRoutes";
import blogRoutes from "./routes/blogRoutes";
import codesRoutes from "./routes/codesRoutes";
import http from "http";
import WebSocket from 'ws';

const rootDir = process.env.ROOT_DIR as string;

const PORT = process.env.PORT || 5500;

const app = express();
const server = http.createServer(app);

const apiPrefix = "/api";

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("A new client connected!");
    ws.send("Welcome New Client!");
})

connectDB();

app.use(express.static("public"));

app.use("/uploads", express.static(path.join(rootDir, "uploads")));

app.use(logger);

app.use(cors(corsOptions));

app.use(express.json({ limit: "2mb" }));

app.use(cookieParser());

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/profile`, profileRoutes);
app.use(`${apiPrefix}/discussion`, discussionRoutes);
app.use(`${apiPrefix}/blog`, blogRoutes);
app.use(`${apiPrefix}/codes`, codesRoutes);

app.all("*", (req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, "..", "views", "404.html"));
    }
    else if (req.accepts('json')) {
        res.json({ message: "404 Not Found" });
    }
    else {
        res.send("404 Not Found");
    }
})

app.use(errorHandler);

mongoose.connection.once("open", () => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

mongoose.connection.once("error", (err: any) => {
    console.log(err);
    logEvents(`${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`, 'mongoErrLog.log');
});
