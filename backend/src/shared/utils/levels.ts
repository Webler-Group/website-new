/**
 * XP <-> level formulas, shared by the backend and the frontend.
 *
 * The frontend imports this file directly via the "@shared" alias (see frontend/vite.config.ts),
 * so everything in backend/src/shared must stay dependency-free: no imports, no Node APIs.
 *
 * Total XP needed for a level: 25 * (x + x^2), where x = level - 1
 * (level 1: 0 XP, level 2: 50 XP, level 3: 150 XP, level 4: 300 XP, ...)
 */

/** Total XP needed to reach the given level */
export const totalXpToReachLevel = (level: number): number => {
    const x = level - 1;
    return 25 * (x + x * x);
};

/** Level for the given total XP */
export const levelFromXp = (xp: number): number => {
    const x = Math.floor(
        (-1 + Math.sqrt(1 + (4 * xp) / 25)) / 2
    );

    return x + 1;
};

/** Progress within the current level, for progress bars */
export const getLevelProgress = (xp: number) => {
    const level = levelFromXp(xp);
    const levelStartXp = totalXpToReachLevel(level);
    const nextLevelXp = totalXpToReachLevel(level + 1);

    return {
        level,
        /** XP earned since reaching the current level */
        current: xp - levelStartXp,
        /** XP span of the current level */
        required: nextLevelXp - levelStartXp,
        /** XP still missing to the next level */
        remaining: nextLevelXp - xp
    };
};
