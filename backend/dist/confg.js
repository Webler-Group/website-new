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
    homeUrl: process.env.HOME_URL,
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
    emailSecure: (process.env.EMAIL_SECURE ? Boolean(process.env.EMAIL_SECURE) : undefined)
};
exports.config = config;
for (let [k, v] of Object.entries(config)) {
    if (typeof v === "undefined") {
        console.warn(`Config: Varible ${k} is not set`);
    }
}
