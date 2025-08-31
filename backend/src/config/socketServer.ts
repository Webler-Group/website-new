import { Server, Socket } from "socket.io";
import http from "http";
import verifyJWTWebSocket from "../middleware/verifyJWTWebSocket";
import { config } from "../confg";

// Map<userId, Set<socketId>>
const onlineUsers = new Map<string, Set<string>>();
let io: Server;

const init = (
    server: http.Server,
    registerHandlers: (socket: Socket) => void
) => {
    io = new Server(server, {
        cors: {
            origin: config.allowedOrigins,
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

            // Add socket.id to the user’s set
            if (!onlineUsers.has(userId)) {
                onlineUsers.set(userId, new Set());
            }
            onlineUsers.get(userId)!.add(socket.id);
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

const getIO = () => io;

const uidRoom = (userId: string) => "uid-" + userId;
const devRoom = (deviceId: string) => "dev-" + deviceId;

export {
    init,
    getIO,
    uidRoom,
    devRoom,
    onlineUsers
};
