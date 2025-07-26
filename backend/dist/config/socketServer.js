"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.devRoom = exports.uidRoom = exports.getIO = exports.init = void 0;
const socket_io_1 = require("socket.io");
const allowedOrigins_1 = __importDefault(require("./allowedOrigins"));
const verifyJWTWebSocket_1 = __importDefault(require("../middleware/verifyJWTWebSocket"));
let io;
const init = (server, registerHandlers) => {
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
        const deviceId = socket.data.deviceId;
        socket.join(devRoom(deviceId));
        if (userId) {
            socket.join(uidRoom(userId));
        }
        registerHandlers(socket);
    });
};
exports.init = init;
const getIO = () => {
    return io;
};
exports.getIO = getIO;
const uidRoom = (userId) => "uid-" + userId;
exports.uidRoom = uidRoom;
const devRoom = (deviceId) => "dev-" + deviceId;
exports.devRoom = devRoom;
