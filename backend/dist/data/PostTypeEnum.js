"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PostTypeEnum;
(function (PostTypeEnum) {
    PostTypeEnum[PostTypeEnum["QUESTION"] = 1] = "QUESTION";
    PostTypeEnum[PostTypeEnum["ANSWER"] = 2] = "ANSWER";
    PostTypeEnum[PostTypeEnum["CODE_COMMENT"] = 3] = "CODE_COMMENT";
    PostTypeEnum[PostTypeEnum["FEED"] = 4] = "FEED";
    PostTypeEnum[PostTypeEnum["SHARED_FEED"] = 5] = "SHARED_FEED";
    PostTypeEnum[PostTypeEnum["FEED_COMMENT"] = 6] = "FEED_COMMENT";
    PostTypeEnum[PostTypeEnum["LESSON_COMMENT"] = 7] = "LESSON_COMMENT";
})(PostTypeEnum || (PostTypeEnum = {}));
exports.default = PostTypeEnum;
