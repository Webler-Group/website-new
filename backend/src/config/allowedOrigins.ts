import dotenv from "dotenv";
dotenv.config();

const allowedOrigins =
    process.env.NODE_ENV === "production" ?
        [
            "https://api-webler.onrender.com",
            "https://webler.onrender.com"
        ] :
        [
            "http://localhost:5500",
            "http://localhost:5173",
            "http://192.168.1.106:5173",
            "http://192.168.1.106:5500",
            "https://api-webler.onrender.com",
            "https://webler.onrender.com",
            ""
        ];

export default allowedOrigins;