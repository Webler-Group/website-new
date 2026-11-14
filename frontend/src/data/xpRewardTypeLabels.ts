import XpRewardTypeEnum from "@shared/data/XpRewardTypeEnum";

export const xpRewardTypeLabels: Record<XpRewardTypeEnum, string> = {
    [XpRewardTypeEnum.CHALLENGE_FIRST_SOLVE]: "Challenge solved",
    [XpRewardTypeEnum.CHALLENGE_OTHER_LANGUAGE]: "Solved in a new language",
    [XpRewardTypeEnum.DAILY_ACTIVITY_BONUS]: "Daily activity bonus",
};
