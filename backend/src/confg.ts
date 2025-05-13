import dotenv from "dotenv";
dotenv.config();

export const config = {
    nodeEnv: process.env.NODE_ENV as string,

    rootDir: process.env.ROOT_DIR as string,

    port: Number(process.env.PORT) || 5500,
    homeUrl: process.env.HOME_URL as string,
    domainName: process.env.DOMAIN_NAME as string,

    databaseUri: process.env.DATABASE_URI as string,

    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET as string,
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET as string,
    emailTokenSecret: process.env.EMAIL_TOKEN_SECRET as string
};