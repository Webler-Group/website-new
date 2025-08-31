"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dbConn_1 = __importDefault(require("../config/dbConn"));
const User_1 = __importDefault(require("../models/User"));
const tokenUtils_1 = require("../utils/tokenUtils");
const deviceId = "localhost";
async function main() {
    // Get project directory from command-line args
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        process.exit(1);
    }
    const email = args[0];
    await (0, dbConn_1.default)();
    const adminUser = await User_1.default.findOne({ email });
    if (adminUser) {
        const { accessToken } = await (0, tokenUtils_1.signAccessToken)({ userId: adminUser._id.toString(), roles: adminUser.roles }, deviceId, "30d");
        console.log("Access token (" + email + "): " + accessToken);
    }
    else {
        console.log("User does not exist (" + email + ")");
    }
    process.exit(0);
}
main();
