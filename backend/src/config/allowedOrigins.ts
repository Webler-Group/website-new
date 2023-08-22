import dotenv from "dotenv";
dotenv.config();

const allowedOrigins =
    process.env.NODE_ENV === "production" ?
        [
            "http://142.11.239.109",
            "http://chillpillcoding.com",
        ] :
        [
            "http://142.11.239.109",
            "http://chillpillcoding.com",
            "http://localhost:5500",
            "http://localhost:5173",
            ""
        ];

export default allowedOrigins;