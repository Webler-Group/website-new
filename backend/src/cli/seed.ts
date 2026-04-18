import { config } from "../confg";
import connectDB from "../config/dbConn";
import tags from "../data/tags";
import badges from "../data/badges";
import RolesEnum from "../data/RolesEnum";
import Tag from "../models/Tag";
import User from "../models/User";
import Badge from "../models/Badge";

async function main() {
    await connectDB();

    await Promise.all([
        Tag.syncIndexes(),
        Badge.syncIndexes(),
        User.syncIndexes()
    ]);

    await Tag.bulkWrite(
        tags.map(name => ({
            updateOne: {
                filter: { name },
                update: { $setOnInsert: { name } },
                upsert: true
            }
        }))
    );

    console.log("Tag added successfuly");

    await Badge.bulkWrite(
        badges.map(badge => ({
            updateOne: {
                filter: { key: badge.key },
                update: { $setOnInsert: badge },
                upsert: true
            }
        }))
    );

    console.log("Badges added successfuly");

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