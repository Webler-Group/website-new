import fs from "fs"
import path from "path";

const allowedOrigins = fs.readFileSync(path.join(__dirname, "..", "..", ".allowed-origins"), { encoding: "utf-8" })
    .split("\n")
    .map(line => line.trim());

export default allowedOrigins;