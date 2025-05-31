import {config} from "../confg";
import connectDB from "../config/dbConn";
import User from "../models/User";

async function main() {
    await connectDB();

    let adminUser = await User.findOne({ email: config.adminEmail });
    if(adminUser) {
        console.log("Admin user already exists.");
    } else {
        adminUser = await User.create({
            email: config.adminEmail,
            password: config.adminPassword,
            name: "WeblerCodes",
            roles: ["Admin"],
            emailVerified: true
        });

        console.log("Admin user created successfully.");
    }

    process.exit(0);
}

main();