import dotenv from "dotenv";
import os from "os";
import path from "path";
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

    // Number of jobs one code runner process executes in parallel (each in its own containers)
    codeRunnerConcurrency: Number(process.env.CODE_RUNNER_CONCURRENCY) || 4,
    // Distinguishes code runner processes on the same machine so they only clean up their own containers
    codeRunnerWorkerId: Number(process.env.CODE_RUNNER_WORKER_ID) || 0,

    // Memory limit for running user programs (KB)
    compilerMemLimit: Number(process.env.COMPILER_MEM_LIMIT) || (128 * 1024),
    // Largest file / total output a user program may write before it is killed (KB)
    compilerFsizeLimit: Number(process.env.COMPILER_FSIZE_LIMIT) || (4 * 1024),
    // How much of stdout / stderr / compiler output is kept and returned to the user (bytes)
    codeOutputLimit: Number(process.env.CODE_OUTPUT_LIMIT) || (4 * 1024),

    // Sandbox images built from sandbox/images, named <prefix>-<lang>:<tag>
    runnerImagePrefix: process.env.RUNNER_IMAGE_PREFIX || "ghcr.io/webler-group/website-new-runner",
    // Pin to a commit sha in production so an image rebuild can't change behaviour unnoticed
    runnerImageTag: process.env.RUNNER_IMAGE_TAG || "latest",
    // Optional Docker runtime, e.g. "runsc" for gVisor
    runnerRuntime: process.env.RUNNER_RUNTIME || "",
    // Host directory for per-job source/build dirs; must be visible to the Docker daemon at the same path
    runnerJobsDir: process.env.RUNNER_JOBS_DIR || path.join(os.tmpdir(), "website-new-runner"),

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