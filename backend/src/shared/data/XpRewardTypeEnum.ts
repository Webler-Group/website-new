enum XpRewardTypeEnum {
    /** First solve of a challenge (in any language); amount depends on difficulty */
    CHALLENGE_FIRST_SOLVE = 1,
    /** Solve of an already solved challenge in another language */
    CHALLENGE_OTHER_LANGUAGE = 2,
    /** First newly solved challenge + language combination of the day */
    DAILY_ACTIVITY_BONUS = 3
}

export default XpRewardTypeEnum;
