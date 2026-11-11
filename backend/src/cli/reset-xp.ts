import mongoose from "mongoose";
import connectDB from "../config/dbConn";
import UserModel from "../models/User";
import XpLogModel from "../models/XpLog";
import ChallengeModel from "../models/Challenge";
import ChallengeSubmissionModel from "../models/ChallengeSubmission";
import ChallengeUnlockModel from "../models/ChallengeUnlock";
import CodeModel from "../models/Code";

/**
 * Resets the XP system: every user starts again at level 1 with 0 XP and no solved challenges.
 *
 * Deletes:   XP log, challenge submissions (solved state + passing sources), unlocked solutions
 * Resets:    User.xp / User.level, challenge submission statistics (acceptance rate)
 * Removes:   the legacy per-challenge `xp` field (XP now depends on difficulty, see userHelper)
 * Optional:  users' saved challenge code (--include-code)
 *
 * Stop the code runner worker while this runs, otherwise solutions evaluated in the meantime may
 * award XP that is wiped right after.
 *
 * Usage:
 *   npx ts-node src/cli/reset-xp.ts                  dry run, only prints what would be changed
 *   npx ts-node src/cli/reset-xp.ts --confirm        applies the reset
 *   npx ts-node src/cli/reset-xp.ts --confirm --include-code
 */

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const includeCode = args.includes("--include-code");

async function resetXp() {
    await connectDB();

    const challengeCodeFilter = { challenge: { $ne: null } };
    const counts = {
        xpLogs: await XpLogModel.countDocuments({}),
        submissions: await ChallengeSubmissionModel.countDocuments({}),
        unlocks: await ChallengeUnlockModel.countDocuments({}),
        usersWithXp: await UserModel.countDocuments({ $or: [{ xp: { $ne: 0 } }, { level: { $ne: 1 } }] }),
        challenges: await ChallengeModel.countDocuments({}),
        challengeCodes: await CodeModel.countDocuments(challengeCodeFilter)
    };

    console.log(confirm ? "Resetting XP system..." : "DRY RUN - nothing is changed, run with --confirm to apply");
    console.log(`  XP log records to delete:          ${counts.xpLogs}`);
    console.log(`  Challenge submissions to delete:   ${counts.submissions}`);
    console.log(`  Unlocked solutions to delete:      ${counts.unlocks}`);
    console.log(`  Users to reset to level 1 / 0 XP:  ${counts.usersWithXp}`);
    console.log(`  Challenges to reset statistics:    ${counts.challenges}`);
    console.log(`  Saved challenge codes:             ${counts.challengeCodes} (${includeCode ? "will be deleted" : "kept, use --include-code to delete"})`);

    if (!confirm) {
        await mongoose.disconnect();
        return;
    }

    // Unique indexes guarding against double rewards must exist before new XP is awarded
    await XpLogModel.syncIndexes();

    await XpLogModel.deleteMany({});
    await ChallengeSubmissionModel.deleteMany({});
    await ChallengeUnlockModel.deleteMany({});
    if (includeCode) {
        await CodeModel.deleteMany(challengeCodeFilter);
    }

    // updateMany skips the pre-save hook, so the level is reset explicitly
    await UserModel.updateMany({}, { $set: { xp: 0, level: 1 } });

    // Legacy `xp` is not in the schema any more; strict mode would drop it from a plain $unset
    await ChallengeModel.collection.updateMany({}, {
        $set: { totalSubmissions: 0, passedSubmissions: 0 },
        $unset: { xp: "" }
    });

    console.log("XP reset complete");
    await mongoose.disconnect();
}

resetXp().catch(async (err) => {
    console.error("XP reset failed:", err);
    await mongoose.disconnect();
    process.exit(1);
});
