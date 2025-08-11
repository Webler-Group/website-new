"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dbConn_1 = __importDefault(require("../config/dbConn"));
const User_1 = __importDefault(require("../models/User"));
const tokenUtils_1 = require("../utils/tokenUtils");
const deviceId = "localhost";
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Get project directory from command-line args
        const args = process.argv.slice(2);
        if (args.length !== 1) {
            process.exit(1);
        }
        const email = args[0];
        yield (0, dbConn_1.default)();
        const adminUser = yield User_1.default.findOne({ email });
        if (adminUser) {
            const { accessToken } = yield (0, tokenUtils_1.signAccessToken)({ userId: adminUser._id.toString(), roles: adminUser.roles }, deviceId, "30d");
            console.log("Access token (" + email + "): " + accessToken);
        }
        else {
            console.log("User does not exist (" + email + ")");
        }
        process.exit(0);
    });
}
main();
