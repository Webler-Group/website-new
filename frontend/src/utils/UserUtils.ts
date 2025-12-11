const k = 50;   // recommended constant
const maxLevel = 30;


export function levelFromXP(xp: number): number {
    const level = Math.floor(Math.cbrt(xp / k));
    return Math.min(level, maxLevel);
}


export function xpForLevel(level: number): number {
    return k * Math.pow(level, 3);
}


// XP remaining to level up
export function xpToNextLevel(xp: number): number {
    const level = levelFromXP(xp);
    const nextLevel = Math.min(level + 1, k/2);
    return Math.max(0, xpForLevel(nextLevel) - xp);
}

export function getPercentageToLevel(currentXp: number, nextLevel: number) {
  	return (currentXp / xpForLevel(nextLevel) * 100);
}