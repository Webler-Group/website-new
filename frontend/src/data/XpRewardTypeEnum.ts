enum XpRewardTypeEnum {
    /** First solve of a challenge (in any language); amount depends on difficulty */
    CHALLENGE_FIRST_SOLVE = 1,
    /** Solve of an already solved challenge in another language */
    CHALLENGE_OTHER_LANGUAGE = 2,
    /** First newly solved challenge + language combination of the day */
    DAILY_ACTIVITY_BONUS = 3
}

export const xpRewardTypeLabels: Record<XpRewardTypeEnum, string> = {
    [XpRewardTypeEnum.CHALLENGE_FIRST_SOLVE]: "Challenge solved",
    [XpRewardTypeEnum.CHALLENGE_OTHER_LANGUAGE]: "Solved in a new language",
    [XpRewardTypeEnum.DAILY_ACTIVITY_BONUS]: "Daily activity bonus",
};

export default XpRewardTypeEnum;
