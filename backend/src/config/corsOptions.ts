import { CorsOptions } from "cors";
import allowedOrigins from "./allowedOrigins";

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