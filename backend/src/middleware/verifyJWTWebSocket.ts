import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { config } from "../confg";
import { AccessTokenPayload } from "../utils/tokenUtils";

const verifyJWTWebSocket = async (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token;
  const deviceId = socket.handshake.auth?.deviceId;

  if (typeof deviceId === "string") {
    socket.data.deviceId = deviceId;
  }

  if (typeof token !== "string") {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.accessTokenSecret) as AccessTokenPayload;

    const match = await bcrypt.compare(deviceId ?? "", decoded.fingerprint);
    if (!match) {
      return next();
    }

    socket.data.userId = decoded.userInfo.userId;
    socket.data.roles = decoded.userInfo.roles;

    return next();
  } catch (err) {
    return next();
  }
};

export default verifyJWTWebSocket;
