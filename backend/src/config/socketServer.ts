import { Server, Socket } from "socket.io";
import http from "http";
import allowedOrigins from "./allowedOrigins";
import verifyJWTWebSocket from "../middleware/verifyJWTWebSocket";

let io: Server;

const init = (server: http.Server, registerHandlers: (socket: Socket) => void) => {
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
        const deviceId = socket.data.deviceId;

        socket.join(devRoom(deviceId));

        if (userId) {
            socket.join(uidRoom(userId));
        }

        registerHandlers(socket);
    });
}

const getIO = () => {
    return io;
}

const uidRoom = (userId: string) => "uid-" + userId;
const devRoom = (deviceId: string) => "dev-" + deviceId;

export {
    init,
    getIO,
    uidRoom,
    devRoom
}