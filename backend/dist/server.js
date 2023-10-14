"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
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
const http_1 = __importDefault(require("http"));
const ws_1 = __importDefault(require("ws"));
const rootDir = process.env.ROOT_DIR;
const PORT = process.env.PORT || 5500;
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const wss = new ws_1.default.Server({ server });
wss.on("connection", (ws) => {
    console.log("A new client connected!");
    ws.send("Welcome New Client!");
});
(0, dbConn_1.default)();
app.use(express_1.default.static("public"));
app.use("/uploads", express_1.default.static(path_1.default.join(rootDir, "uploads")));
app.use(logger_1.logger);
//app.use(cors(corsOptions));
app.use(express_1.default.json({ limit: "5mb" }));
app.use((0, cookie_parser_1.default)());
app.use("/api/auth", authRoutes_1.default);
app.use("/api/profile", profileRoutes_1.default);
app.use("/api/discussion", discussionRoutes_1.default);
app.use("/api/blog", blogRoutes_1.default);
app.use("/api/codes", codesRoutes_1.default);
app.all("*", (req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.sendFile(path_1.default.join(__dirname, "..", "views", "404.html"));
    }
    else if (req.accepts('json')) {
        res.json({ message: "404 Not Found" });
    }
    else {
        res.send("404 Not Found");
    }
});
app.use(errorHandler_1.default);
mongoose_1.default.connection.once("open", () => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
mongoose_1.default.connection.once("error", (err) => {
    console.log(err);
    (0, logger_1.logEvents)(`${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`, 'mongoErrLog.log');
});
