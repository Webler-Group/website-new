"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const logger_1 = require("./middleware/logger");
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const corsOptions_1 = __importDefault(require("./config/corsOptions"));
const path_1 = __importDefault(require("path"));
const dbConn_1 = __importDefault(require("./config/dbConn"));
const profileRoutes_1 = __importDefault(require("./routes/profileRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const discussionRoutes_1 = __importDefault(require("./routes/discussionRoutes"));
const feedRoutes_1 = __importDefault(require("./routes/feedRoutes"));
const blogRoutes_1 = __importDefault(require("./routes/blogRoutes"));
const codesRoutes_1 = __importDefault(require("./routes/codesRoutes"));
const courseEditorRoutes_1 = __importDefault(require("./routes/courseEditorRoutes"));
const courseRoutes_1 = __importDefault(require("./routes/courseRoutes"));
const channelsRoutes_1 = __importDefault(require("./routes/channelsRoutes"));
const sitemapRoutes_1 = __importDefault(require("./routes/sitemapRoutes"));
const tagRoutes_1 = __importDefault(require("./routes/tagRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const http_1 = __importDefault(require("http"));
const confg_1 = require("./confg");
const cronJobs_1 = require("./services/cronJobs");
const socketServer_1 = require("./config/socketServer");
const channelsController_1 = require("./controllers/channelsController");
const pushService_1 = require("./services/pushService");
async function main() {
    console.log("Environment:", confg_1.config.nodeEnv);
    const app = (0, express_1.default)();
    const server = http_1.default.createServer(app);
    (0, socketServer_1.init)(server, (socket) => {
        (0, channelsController_1.registerHandlersWS)(socket);
    });
    const apiPrefix = "/api";
    await (0, dbConn_1.default)();
    await (0, pushService_1.initKeystore)();
    if (confg_1.config.nodeEnv == "production") {
        (0, cronJobs_1.initCronJobs)();
    }
    app.use("/uploads", express_1.default.static(path_1.default.join(confg_1.config.rootDir, "uploads")));
    app.use(logger_1.logger);
    app.use(`${apiPrefix}/Sitemap`, sitemapRoutes_1.default);
    if (confg_1.config.nodeEnv == "production") {
        app.use((0, cors_1.default)(corsOptions_1.default));
    }
    app.use(express_1.default.json({ limit: "2mb" }));
    app.use((0, cookie_parser_1.default)());
    app.use(`${apiPrefix}/Test`, (req, res) => {
        res.send("Server is up and running");
    });
    app.use(`${apiPrefix}/Auth`, authRoutes_1.default);
    app.use(`${apiPrefix}/Profile`, profileRoutes_1.default);
    app.use(`${apiPrefix}/Discussion`, discussionRoutes_1.default);
    app.use(`${apiPrefix}/Feed`, feedRoutes_1.default);
    app.use(`${apiPrefix}/Blog`, blogRoutes_1.default);
    app.use(`${apiPrefix}/Codes`, codesRoutes_1.default);
    app.use(`${apiPrefix}/CourseEditor`, courseEditorRoutes_1.default);
    app.use(`${apiPrefix}/Courses`, courseRoutes_1.default);
    app.use(`${apiPrefix}/Channels`, channelsRoutes_1.default);
    app.use(`${apiPrefix}/Tag`, tagRoutes_1.default);
    app.use(`${apiPrefix}/PushNotifications`, notificationRoutes_1.default);
    app.use(`${apiPrefix}/Admin`, adminRoutes_1.default);
    app.all("*", (req, res) => {
        res.status(404).json({ success: false, message: "404 Not Found" });
    });
    app.use(errorHandler_1.default);
    server.listen(confg_1.config.port, () => console.log(`Server running on port ${confg_1.config.port}`));
}
main();
