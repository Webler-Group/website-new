import { CorsOptions } from "cors";
import { config } from "../confg";

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        origin = origin ? origin : "";

        if (config.allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: "*"
};

export default corsOptions;