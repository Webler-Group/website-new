export enum ReactionsEnum {
    LIKE = 1,
    HAHA = 2,
    ANGRY = 3,
    LOVE = 4,
    SAD = 5,
    WOW = 6
}

export const reactionsInfo = {
  [ReactionsEnum.LIKE]: { emoji: "👍", label: "Like", color: "#1877f2" },
  [ReactionsEnum.LOVE]: { emoji: "❤️", label: "Love", color: "#e91e63" },
  [ReactionsEnum.HAHA]: { emoji: "😂", label: "Haha", color: "#f39c12" },
  [ReactionsEnum.WOW]: { emoji: "😮", label: "Wow", color: "#f39c12" },
  [ReactionsEnum.SAD]: { emoji: "😢", label: "Sad", color: "#f39c12" },
  [ReactionsEnum.ANGRY]: { emoji: "😡", label: "Angry", color: "#e74c3c" }
};