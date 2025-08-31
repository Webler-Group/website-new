"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    nodeEnv: process.env.NODE_ENV,
    rootDir: process.env.ROOT_DIR,
    port: Number(process.env.PORT) || 5500,
    domainName: process.env.DOMAIN_NAME,
    databaseUri: process.env.DATABASE_URI,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    emailTokenSecret: process.env.EMAIL_TOKEN_SECRET,
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
    dumpDir: process.env.DUMP_DIR,
    logDir: process.env.LOG_DIR,
    compilerMemLimit: Number(process.env.COMPILER_MEM_LIMIT) || (128 * 1024),
    compilerFsizeLimit: Number(process.env.COMPILER_FSIZE_LIMIT) || (4 * 1024),
    emailHost: process.env.EMAIL_HOST,
    emailPort: (process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined),
    emailUser: process.env.EMAIL_USER,
    emailPassword: process.env.EMAIL_PASSWORD,
    emailSecure: (process.env.EMAIL_SECURE ? Boolean(process.env.EMAIL_SECURE) : undefined),
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(";")
};
exports.config = config;
const required = config.nodeEnv === "development" ?
    ["rootDir", "port", "allowedOrigins", "domainName", "databaseUri", "refreshTokenSecret", "accessTokenSecret", "adminEmail", "adminPassword", "logDir"] :
    ["rootDir", "port", "allowedOrigins", "domainName", "databaseUri", "refreshTokenSecret", "accessTokenSecret", "adminEmail", "adminPassword", "logDir", "emailTokenSecret", "dumpDir", "emailHost", "emailPort", "emailUser", "emailPassword", "emailSecure"];
for (let [k, v] of Object.entries(config)) {
    if (v !== undefined)
        continue;
    if (k in required) {
        throw new Error(`Environment varible ${k} is required but missing`);
    }
    else {
        console.warn(`Environment varible ${k} is not set`);
    }
}
