"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.init = void 0;
const socket_io_1 = require("socket.io");
const allowedOrigins_1 = __importDefault(require("./allowedOrigins"));
const verifyJWTWebSocket_1 = __importDefault(require("../middleware/verifyJWTWebSocket"));
let io;
const init = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: allowedOrigins_1.default,
            methods: ["POST", "GET"],
            credentials: true
        }
    });
    io.use(verifyJWTWebSocket_1.default);
    io.on("connection", (socket) => {
        const userId = socket.data.userId;
        if (userId) {
            socket.join(userId);
            console.log(`Socket ${socket.id} joined room ${userId}`);
        }
        socket.on("disconnect", () => {
            console.log(`Socket ${socket.id} disconnected`);
        });
    });
};
exports.init = init;
const getIO = () => {
    if (!io) {
        throw new Error("Socket.io is not initialized");
    }
    return io;
};
exports.getIO = getIO;
