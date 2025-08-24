"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlineUsers = exports.devRoom = exports.uidRoom = exports.getIO = exports.init = void 0;
const socket_io_1 = require("socket.io");
const verifyJWTWebSocket_1 = __importDefault(require("../middleware/verifyJWTWebSocket"));
const confg_1 = require("../confg");
// Map<userId, Set<socketId>>
const onlineUsers = new Map();
exports.onlineUsers = onlineUsers;
let io;
const init = (server, registerHandlers) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: confg_1.config.allowedOrigins,
            methods: ["POST", "GET"],
            credentials: true
        }
    });
    io.use(verifyJWTWebSocket_1.default);
    io.on("connection", (socket) => {
        const userId = socket.data.userId;
        const deviceId = socket.data.deviceId;
        socket.join(devRoom(deviceId));
        if (userId) {
            socket.join(uidRoom(userId));
            // Add socket.id to the user’s set
            if (!onlineUsers.has(userId)) {
                onlineUsers.set(userId, new Set());
            }
            onlineUsers.get(userId).add(socket.id);
        }
        registerHandlers(socket);
        socket.on("disconnect", () => {
            if (userId) {
                const sockets = onlineUsers.get(userId);
                if (sockets) {
                    sockets.delete(socket.id);
                    if (sockets.size === 0) {
                        onlineUsers.delete(userId);
                    }
                }
            }
        });
    });
};
exports.init = init;
const getIO = () => io;
exports.getIO = getIO;
const uidRoom = (userId) => "uid-" + userId;
exports.uidRoom = uidRoom;
const devRoom = (deviceId) => "dev-" + deviceId;
exports.devRoom = devRoom;
