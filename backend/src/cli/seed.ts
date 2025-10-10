import {config} from "../confg";
import connectDB from "../config/dbConn";
import tags from "../config/tags";
import RolesEnum from "../data/RolesEnum";
import Challenge from "../models/Challenge";
import Tag from "../models/Tag";
import User from "../models/User";

async function main() {
    await connectDB();

    const tagDocs = tags.map(name => ({ name }));
    await Tag.insertMany(tagDocs);
    console.log("New tags added successfully.");

    let adminUser = await User.findOne({ email: config.adminEmail });
    if(adminUser) {
        console.log("Admin user already exists.");
    } else {
        adminUser = await User.create({
            email: config.adminEmail,
            password: config.adminPassword,
            name: "Webler Codes",
            roles: [RolesEnum.ADMIN],
            emailVerified: true
        });

        console.log("Admin user created successfully.");
    }

    process.exit(0);
}

main();