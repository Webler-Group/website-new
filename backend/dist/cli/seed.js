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
const confg_1 = require("../confg");
const dbConn_1 = __importDefault(require("../config/dbConn"));
const tags_1 = __importDefault(require("../config/tags"));
const Tag_1 = __importDefault(require("../models/Tag"));
const User_1 = __importDefault(require("../models/User"));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, dbConn_1.default)();
        yield Tag_1.default.deleteMany({});
        console.log("All existing tags deleted.");
        const tagDocs = tags_1.default.map(name => ({ name }));
        yield Tag_1.default.insertMany(tagDocs);
        console.log("New tags added successfully.");
        let adminUser = yield User_1.default.findOne({ email: confg_1.config.adminEmail });
        if (adminUser) {
            console.log("Admin user already exists.");
        }
        else {
            adminUser = yield User_1.default.create({
                email: confg_1.config.adminEmail,
                password: confg_1.config.adminPassword,
                name: "WeblerCodes",
                roles: ["Admin"],
                emailVerified: true
            });
            console.log("Admin user created successfully.");
        }
        process.exit(0);
    });
}
main();
