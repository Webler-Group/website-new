export enum ReactionsEnum {
    LIKE = 1,
    HAHA = 2,
    ANGRY = 3,
    LOVE = 4,
    SAD = 5,
    WOW = 6
}

/** `colorClass` sets --wb-reaction-color, see components/reactions/reactions.css */
export const reactionsInfo = {
  [ReactionsEnum.LIKE]: { emoji: "👍", label: "Like", colorClass: "wb-reaction-like" },
  [ReactionsEnum.LOVE]: { emoji: "❤️", label: "Love", colorClass: "wb-reaction-love" },
  [ReactionsEnum.HAHA]: { emoji: "😂", label: "Haha", colorClass: "wb-reaction-haha" },
  [ReactionsEnum.WOW]: { emoji: "😮", label: "Wow", colorClass: "wb-reaction-wow" },
  [ReactionsEnum.SAD]: { emoji: "😢", label: "Sad", colorClass: "wb-reaction-sad" },
  [ReactionsEnum.ANGRY]: { emoji: "😡", label: "Angry", colorClass: "wb-reaction-angry" }
};