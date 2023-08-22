import dotenv from "dotenv";
dotenv.config();

const allowedOrigins =
    process.env.NODE_ENV === "production" ?
        [
            "https://chillpillcoding.com"
        ] :
        [
            "http://localhost:5500",
            "http://localhost:5173",
            ""
        ];

export default allowedOrigins;