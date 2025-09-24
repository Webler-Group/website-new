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

    let initChallenge = await Challenge.findOne({ title: "Getting Started" });
    if(!initChallenge) {
        initChallenge = await Challenge.create({
            title: "Getting Started",
            description: "Write a program that output the string `Hello world` to the standard output\n" +
            "***This program requires to input domain***",
            xp: 20,
            author: adminUser,
            testCases: [{input:"", expectedOutput: "Hello world", isHidden: false}],
            templates: [{name: "python", source: ""}, {name: "cpp", source: ""}, {name: "c", source: ""}]
        });

        console.log("Code Challenge added successfully")
    } else {
        console.log("Code Challenge: Not added - Appear to exists already");
    }

    process.exit(0);
}

main();