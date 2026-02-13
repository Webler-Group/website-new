"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.levelFromXp = exports.totalXpToReachLevel = void 0;
const totalXpToReachLevel = (level) => {
    const x = level - 1;
    return 25 * (x + x * x);
};
exports.totalXpToReachLevel = totalXpToReachLevel;
const levelFromXp = (xp) => {
    const x = Math.floor((-1 + Math.sqrt(1 + (4 * xp) / 25)) / 2);
    return x + 1;
};
exports.levelFromXp = levelFromXp;
