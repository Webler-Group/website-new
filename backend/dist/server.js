"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./middleware/logger");
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const corsOptions_1 = __importDefault(require("./config/corsOptions"));
const path_1 = __importDefault(require("path"));
const dbConn_1 = __importDefault(require("./config/dbConn"));
const mongoose_1 = __importDefault(require("mongoose"));
const profileRoutes_1 = __importDefault(require("./routes/profileRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const discussionRoutes_1 = __importDefault(require("./routes/discussionRoutes"));
dotenv_1.default.config();
const PORT = process.env.PORT || 5500;
const app = (0, express_1.default)();
(0, dbConn_1.default)();
app.use(express_1.default.static("public"));
app.use(logger_1.logger);
app.use((0, cors_1.default)(corsOptions_1.default));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use("/auth", authRoutes_1.default);
app.use("/profile", profileRoutes_1.default);
app.use("/discussion", discussionRoutes_1.default);
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
