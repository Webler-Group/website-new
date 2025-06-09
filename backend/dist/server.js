"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const logger_1 = require("./middleware/logger");
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const dbConn_1 = __importDefault(require("./config/dbConn"));
const mongoose_1 = __importDefault(require("mongoose"));
const profileRoutes_1 = __importDefault(require("./routes/profileRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const discussionRoutes_1 = __importDefault(require("./routes/discussionRoutes"));
const blogRoutes_1 = __importDefault(require("./routes/blogRoutes"));
const codesRoutes_1 = __importDefault(require("./routes/codesRoutes"));
const courseEditorRoutes_1 = __importDefault(require("./routes/courseEditorRoutes"));
const courseRoutes_1 = __importDefault(require("./routes/courseRoutes"));
const http_1 = __importDefault(require("http"));
const ws_1 = __importDefault(require("ws"));
const confg_1 = require("./confg");
console.log(confg_1.config.nodeEnv);
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const apiPrefix = "/api";
const wss = new ws_1.default.Server({ server });
wss.on("connection", (ws) => {
    console.log("A new client connected!");
    ws.send("Welcome New Client!");
});
(0, dbConn_1.default)();
app.use("/uploads", express_1.default.static(path_1.default.join(confg_1.config.rootDir, "uploads")));
app.use(logger_1.logger);
//app.use(cors(corsOptions));
app.use(express_1.default.json({ limit: "2mb" }));
app.use((0, cookie_parser_1.default)());
app.use(`${apiPrefix}/Auth`, authRoutes_1.default);
app.use(`${apiPrefix}/Profile`, profileRoutes_1.default);
app.use(`${apiPrefix}/Discussion`, discussionRoutes_1.default);
app.use(`${apiPrefix}/Blog`, blogRoutes_1.default);
app.use(`${apiPrefix}/Codes`, codesRoutes_1.default);
app.use(`${apiPrefix}/CourseEditor`, courseEditorRoutes_1.default);
app.use(`${apiPrefix}/Courses`, courseRoutes_1.default);
app.all("*", (req, res) => {
    res.status(404).json({ message: "404 Not Found" });
});
app.use(errorHandler_1.default);
mongoose_1.default.connection.once("open", () => {
    app.listen(confg_1.config.port, () => console.log(`Server running on port ${confg_1.config.port}`));
});
mongoose_1.default.connection.once("error", (err) => {
    (0, logger_1.logEvents)(`${err.name}: ${err.message}`, 'mongoErrLog.log');
});
