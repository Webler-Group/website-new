"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ChannelMessageTypeEnum;
(function (ChannelMessageTypeEnum) {
    ChannelMessageTypeEnum[ChannelMessageTypeEnum["MESSAGE"] = 1] = "MESSAGE";
    ChannelMessageTypeEnum[ChannelMessageTypeEnum["USER_JOINED"] = 2] = "USER_JOINED";
    ChannelMessageTypeEnum[ChannelMessageTypeEnum["USER_LEFT"] = 3] = "USER_LEFT";
    ChannelMessageTypeEnum[ChannelMessageTypeEnum["TITLE_CHANGED"] = 4] = "TITLE_CHANGED";
})(ChannelMessageTypeEnum || (ChannelMessageTypeEnum = {}));
exports.default = ChannelMessageTypeEnum;
