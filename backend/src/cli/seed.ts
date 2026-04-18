import { config } from "../confg";
import connectDB from "../config/dbConn";
import tags from "../data/tags";
import RolesEnum from "../data/RolesEnum";
import Tag from "../models/Tag";
import User from "../models/User";

async function main() {
    await connectDB();

    await Tag.bulkWrite(
        data.map(tag => ({
            updateOne: {
                filter: { name: tag.name },
                update: { $setOnInsert: tag },
                upsert: true
            }
        }))
    );



    let adminUser = await User.findOne({ email: config.adminEmail });
    if (adminUser) {
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