import dotenv from "dotenv";
dotenv.config();

const config = {
    nodeEnv: process.env.NODE_ENV as ("development" | "production"),

    rootDir: process.env.ROOT_DIR as string,

    port: Number(process.env.PORT) || 5500,
    domainName: process.env.DOMAIN_NAME as string,

    databaseUri: process.env.DATABASE_URI as string,

    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET as string,
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET as string,
    emailTokenSecret: process.env.EMAIL_TOKEN_SECRET as string,

    adminEmail: process.env.ADMIN_EMAIL as string,
    adminPassword: process.env.ADMIN_PASSWORD as string,

    dumpDir: process.env.DUMP_DIR as string,
    logDir: process.env.LOG_DIR as string,

    redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",

    // Number of jobs one code runner process executes in parallel (each gets its own isolate box)
    codeRunnerConcurrency: Number(process.env.CODE_RUNNER_CONCURRENCY) || 4,
    // Distinguishes code runner processes on the same machine so their isolate box ids don't overlap
    codeRunnerWorkerId: Number(process.env.CODE_RUNNER_WORKER_ID) || 0,

    compilerMemLimit: Number(process.env.COMPILER_MEM_LIMIT) || (128 * 1024),
    compilerFsizeLimit: Number(process.env.COMPILER_FSIZE_LIMIT) || (4 * 1024),

    emailHost: process.env.EMAIL_HOST as string,
    emailPort: (process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined) as number,
    emailUser: process.env.EMAIL_USER as string,
    emailPassword: process.env.EMAIL_PASSWORD as string,
    emailSecure: (process.env.EMAIL_SECURE ? Boolean(process.env.EMAIL_SECURE) : undefined) as boolean,

    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(";") as string[]
};

const required = config.nodeEnv === "development" ? 
    ["rootDir", "port", "allowedOrigins", "domainName", "databaseUri", "refreshTokenSecret", "accessTokenSecret", "adminEmail", "adminPassword", "logDir"] :
    ["rootDir", "port", "allowedOrigins", "domainName", "databaseUri", "refreshTokenSecret", "accessTokenSecret", "adminEmail", "adminPassword", "logDir", "emailTokenSecret", "dumpDir", "emailHost", "emailPort", "emailUser", "emailPassword", "emailSecure"]

for(let [k, v] of Object.entries(config)) {
    if(v !== undefined) continue;
    if(k in required) {
        throw new Error(`Environment varible ${k} is required but missing`);
    } else {
        console.warn(`Environment varible ${k} is not set`);
    }
}

export {config};