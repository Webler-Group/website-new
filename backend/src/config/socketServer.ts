import { Server } from "socket.io";
import http from "http";
import allowedOrigins from "./allowedOrigins";
import verifyJWTWebSocket from "../middleware/verifyJWTWebSocket";

let io: Server;

const init = (server: http.Server) => {
    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["POST", "GET"],
            credentials: true
        }
    });

    io.use(verifyJWTWebSocket);

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
}

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io is not initialized");
    }
    return io;
}

export {
    init,
    getIO
}