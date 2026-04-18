export type badge_t = "first_step" |
    "identity_set" |
    "hello_world" |
    "viral_spark" |
    "first_voice" |
    "crowd_builder" |
    "influencer" |
    "conversationist" |
    "active_mind" |
    "creator" |
    "moderator" |
    "level_5" |
    "maxed_out" |
    "plutomania" |
    "xp_grinder" |
    "dedicated" |
    "legend" |
    "mentor" |
    "og_member" |
    "marathoner" |
    "unstoppable";


interface iBadge {
    key: badge_t,
    description: string,
    icon: string,
    xpReward: number
};


const badges: iBadge[] = [
    {
        key: "first_step",
        description: "Verify your email address",
        icon: "",
        xpReward: 20
    },
    
    {
        key: "identity_set",
        description: "Upload avatar",
        icon: "",
        xpReward: 20
    },
    {
        key: "hello_world",
        description: "Start a discussion",
        icon: "",
        xpReward: 20
    },

    {
        key: "viral_spark",
        description: "post hit 5 likes",
        icon: "",
        xpReward: 20
    },

    {
        key: "first_voice",
        description: "First comment",
        icon: "",
        xpReward: 20
    },
    {
        key: "crowd_builder",
        description: "50 followers",
        icon: "",
        xpReward: 20
    },
    {
        key: "influencer",
        description: "1000 followers",
        icon: "",
        xpReward: 20
    },

    {
        key: "conversationist",
        description: "50 comments",
        icon: "",
        xpReward: 20
    },
    {
        key: "active_mind",
        description: "500 comments",
        icon: "",
        xpReward: 20
    },

    {
        key: "creator",
        description: "Become a webler creator",
        icon: "",
        xpReward: 500
    },

    {
        key: "moderator",
        description: "Become a webler moderator",
        icon: "",
        xpReward: 500
    },

    {
        key: "level_5",
        description: "Reach level 5",
        icon: "",
        xpReward: 0
    },

    {
        key: "maxed_out",
        description: "Reach level 30",
        icon: "",
        xpReward: 0
    },

    {
        key: "plutomania",
        description: "Earn 17000 XP",
        icon: "",
        xpReward: 0
    },

    {
        key: "xp_grinder",
        description: "Earn 25000 XP",
        icon: "",
        xpReward: 0
    },

    {
        key: "dedicated",
        description: "Earn 50000 XP",
        icon: "",
        xpReward: 0
    },

    {
        key: "legend",
        description: "Earn 75000 XP",
        icon: "",
        xpReward: 0
    },
    

    {
        key: "mentor",
        description: "500 liked comments",
        icon: "",
        xpReward: 20
    },

    {
        key: "og_member",
        description: "First 1000 users",
        icon: "",
        xpReward: 20
    },

    {
        key: "marathoner",
        description: "Active 100 days",
        icon: "",
        xpReward: 20
    },

    {
        key: "unstoppable",
        description: "365-day streak",
        icon: "",
        xpReward: 20
    }
];


export default badges;