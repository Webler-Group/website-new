"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const confg_1 = require("../confg");
const dbConn_1 = __importDefault(require("../config/dbConn"));
const tags_1 = __importDefault(require("../config/tags"));
const Tag_1 = __importDefault(require("../models/Tag"));
const User_1 = __importDefault(require("../models/User"));
async function main() {
    await (0, dbConn_1.default)();
    await Tag_1.default.deleteMany({});
    console.log("All existing tags deleted.");
    const tagDocs = tags_1.default.map(name => ({ name }));
    await Tag_1.default.insertMany(tagDocs);
    console.log("New tags added successfully.");
    let adminUser = await User_1.default.findOne({ email: confg_1.config.adminEmail });
    if (adminUser) {
        console.log("Admin user already exists.");
    }
    else {
        adminUser = await User_1.default.create({
            email: confg_1.config.adminEmail,
            password: confg_1.config.adminPassword,
            name: "WeblerCodes",
            roles: ["Admin"],
            emailVerified: true
        });
        console.log("Admin user created successfully.");
    }
    process.exit(0);
}
main();
