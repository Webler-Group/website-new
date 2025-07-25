import { Socket } from "socket.io";
import jwt, { VerifyErrors } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { config } from "../confg";
import { AccessTokenPayload } from "../utils/tokenUtils";

// Middleware function for Socket.IO
const verifyJWTWebSocket = async (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token;
  const deviceId = socket.handshake.auth?.deviceId;

  // Validate presence of required auth data
  if (typeof token !== "string" || typeof deviceId !== "string") {
    return next(new Error("Unauthorized: Missing token or device ID"));
  }

  try {
    // Verify JWT and extract payload
    const decoded = jwt.verify(token, config.accessTokenSecret) as AccessTokenPayload;

    // Compare the provided device ID to the hashed fingerprint in the token
    const match = await bcrypt.compare(deviceId, decoded.fingerprint);
    if (!match) {
      return next(new Error("Unauthorized: Invalid device fingerprint"));
    }

    // Attach user info to socket for future use
    socket.data.userId = decoded.userInfo.userId;
    socket.data.roles = decoded.userInfo.roles;

    next();
  } catch (err) {
    const error = err as VerifyErrors;
    console.error("Socket JWT verification failed:", error.message);
    next(new Error("Unauthorized: Invalid or expired token"));
  }
};

export default verifyJWTWebSocket;
