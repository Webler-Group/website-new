import dotenv from "dotenv";
dotenv.config();

const allowedOrigins =
    process.env.NODE_ENV === "production" ?
        [

        ] :
        [
            "http://localhost:5500",
            "http://localhost:5173",
            ""
        ];

export default allowedOrigins;