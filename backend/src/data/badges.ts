export type badge_t = "first_step" |
    "creator" |
    "identity_set" |
    "moderator" |
    "level_5" |
    "maxed_out" |
    "plutomania" |
    "xp_grinder" |
    "dedicated" |
    "legend" |
    "og_member" |

    "hello_world" |
    "viral_spark" |
    "first_voice" |
    "crowd_builder" |
    "influencer" |
    "conversationist" |
    "active_mind" |
    "mentor" |
    "marathoner" |
    "unstoppable";


interface iBadge {
    key: badge_t,
    description: string,
    xpReward: number
};


const badges: iBadge[] = [
    {
        key: "first_step",
        description: "Verify your email address",
        xpReward: 20
    },
    
    {
        key: "creator",
        description: "Become a webler creator",
        xpReward: 5000
    },

    {
        key: "moderator",
        description: "Become a webler moderator",
        xpReward: 5000
    },


    {
        key: "identity_set",
        description: "Complete your profile setup",
        xpReward: 100
    },

    {
        key: "og_member",
        description: "First 500 users",
        xpReward: 1000
    },


    {
        key: "level_5",
        description: "Reach level 5",
        xpReward: 0
    },

    {
        key: "maxed_out",
        description: "Reach level 30",
        xpReward: 0
    },

    {
        key: "plutomania",
        description: "Earn 17000 XP",
        xpReward: 0
    },

    {
        key: "xp_grinder",
        description: "Earn 25000 XP",
        xpReward: 0
    },

    {
        key: "dedicated",
        description: "Earn 50000 XP",
        xpReward: 0
    },

    {
        key: "legend",
        description: "Earn 75000 XP",
        xpReward: 0
    },

    {
        key: "crowd_builder",
        description: "50 followers",
        xpReward: 100
    },

    {
        key: "influencer",
        description: "1000 followers",
        xpReward: 200
    },

    {
        key: "hello_world",
        description: "Start a discussion and earn 1 like",
        xpReward: 2
    },


    {
        key: "viral_spark",
        description: "Discussion hit 5 likes",
        xpReward: 20
    },


    {
        key: "first_voice",
        description: "First comment",
        xpReward: 4
    },

    {
        key: "conversationist",
        description: "50 comments",
        xpReward: 20
    },

    {
        key: "active_mind",
        description: "500 comments",
        xpReward: 20
    },

    {
        key: "mentor",
        description: "500 liked comments",
        xpReward: 20
    },

    {
        key: "marathoner",
        description: "Active 100 days",
        xpReward: 20
    },

    {
        key: "unstoppable",
        description: "365-day streak",
        xpReward: 20
    }
];


export default badges;