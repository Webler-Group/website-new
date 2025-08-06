import connectDB from "../config/dbConn";
import User from "../models/User";
import { signAccessToken } from "../utils/tokenUtils";

const deviceId = "localhost";

async function main() {
    // Get project directory from command-line args
    const args = process.argv.slice(2);

    if (args.length !== 1) {
        process.exit(1);
    }

    const email = args[0];

    await connectDB();

    const adminUser = await User.findOne({ email });
    if (adminUser) {
        const { accessToken } = await signAccessToken({ userId: adminUser._id.toString(), roles: adminUser.roles }, deviceId, "30d");
        console.log("Access token (" + email + "): " + accessToken);
    } else {
        console.log("User does not exist (" + email + ")");
    }

    process.exit(0);
}

main();