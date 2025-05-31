import {config} from "../src/confg";
import connectDB from "../src/config/dbConn";
import User from "../src/models/User";

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