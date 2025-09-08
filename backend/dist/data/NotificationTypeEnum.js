"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var NotificationTypeEnum;
(function (NotificationTypeEnum) {
    NotificationTypeEnum[NotificationTypeEnum["PROFILE_FOLLOW"] = 101] = "PROFILE_FOLLOW";
    NotificationTypeEnum[NotificationTypeEnum["QA_ANSWER"] = 201] = "QA_ANSWER";
    NotificationTypeEnum[NotificationTypeEnum["CODE_COMMENT"] = 202] = "CODE_COMMENT";
    NotificationTypeEnum[NotificationTypeEnum["QA_QUESTION_MENTION"] = 203] = "QA_QUESTION_MENTION";
    NotificationTypeEnum[NotificationTypeEnum["QA_ANSWER_MENTION"] = 204] = "QA_ANSWER_MENTION";
    NotificationTypeEnum[NotificationTypeEnum["CODE_COMMENT_MENTION"] = 205] = "CODE_COMMENT_MENTION";
    NotificationTypeEnum[NotificationTypeEnum["FEED_FOLLOWER_POST"] = 301] = "FEED_FOLLOWER_POST";
    NotificationTypeEnum[NotificationTypeEnum["FEED_COMMENT"] = 302] = "FEED_COMMENT";
    NotificationTypeEnum[NotificationTypeEnum["FEED_SHARE"] = 303] = "FEED_SHARE";
    NotificationTypeEnum[NotificationTypeEnum["FEED_PIN"] = 304] = "FEED_PIN";
    NotificationTypeEnum[NotificationTypeEnum["FEED_COMMENT_MENTION"] = 305] = "FEED_COMMENT_MENTION";
    NotificationTypeEnum[NotificationTypeEnum["LESSON_COMMENT"] = 401] = "LESSON_COMMENT";
    NotificationTypeEnum[NotificationTypeEnum["LESSON_COMMENT_MENTION"] = 402] = "LESSON_COMMENT_MENTION";
})(NotificationTypeEnum || (NotificationTypeEnum = {}));
exports.default = NotificationTypeEnum;
