export const totalXpToReachLevel = (level: number): number => {
    const x = level - 1;
    return 25 * (x + x * x);
}

export const levelFromXp = (xp: number): number => {
    const x = Math.floor(
        (-1 + Math.sqrt(1 + (4 * xp) / 25)) / 2
    );

    return x + 1;
}
