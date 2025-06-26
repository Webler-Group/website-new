import { CorsOptions } from "cors";
import fs from "fs"
import path from "path";

const allowedOrigins = fs.readFileSync(path.join(__dirname, "..", "..", ".allowed-origins"), { encoding: "utf-8" })
    .split("\n")
    .map(line => line.trim());

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        origin = origin ? origin : "";

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS\nOrigin: ' + origin + '\nAllowed origins: ' + allowedOrigins.join(", ")));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

export default corsOptions;