"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LessonNodeTypeEnum;
(function (LessonNodeTypeEnum) {
    LessonNodeTypeEnum[LessonNodeTypeEnum["TEXT"] = 1] = "TEXT";
    LessonNodeTypeEnum[LessonNodeTypeEnum["SINGLECHOICE_QUESTION"] = 2] = "SINGLECHOICE_QUESTION";
    LessonNodeTypeEnum[LessonNodeTypeEnum["MULTICHOICE_QUESTION"] = 3] = "MULTICHOICE_QUESTION";
    LessonNodeTypeEnum[LessonNodeTypeEnum["TEXT_QUESTION"] = 4] = "TEXT_QUESTION";
})(LessonNodeTypeEnum || (LessonNodeTypeEnum = {}));
exports.default = LessonNodeTypeEnum;
