"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Course_1 = __importDefault(require("../models/Course"));
const CourseProgress_1 = __importDefault(require("../models/CourseProgress"));
const CourseLesson_1 = __importDefault(require("../models/CourseLesson"));
const LessonNode_1 = __importDefault(require("../models/LessonNode"));
const QuizAnswer_1 = __importDefault(require("../models/QuizAnswer"));
const User_1 = __importDefault(require("../models/User"));
const RolesEnum_1 = __importDefault(require("../data/RolesEnum"));
const LessonNodeTypeEnum_1 = __importDefault(require("../data/LessonNodeTypeEnum"));
const Post_1 = __importDefault(require("../models/Post"));
const PostAttachment_1 = __importDefault(require("../models/PostAttachment"));
const Notification_1 = __importDefault(require("../models/Notification"));
const NotificationTypeEnum_1 = __importDefault(require("../data/NotificationTypeEnum"));
const PostTypeEnum_1 = __importDefault(require("../data/PostTypeEnum"));
const Upvote_1 = __importDefault(require("../models/Upvote"));
const courseSchema_1 = require("../validation/courseSchema");
const zodUtils_1 = require("../utils/zodUtils");
const getCourseList = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseSchema_1.getCourseListSchema, req);
    const { excludeUserId } = body;
    let result;
    if (excludeUserId) {
        const progresses = await CourseProgress_1.default.find({ userId: excludeUserId }).select("course");
        const startedCourseIds = progresses.map(x => x.course);
        result = await Course_1.default.find({
            visible: true,
            _id: { $nin: startedCourseIds }
        });
    }
    else {
        result = await Course_1.default.find({ visible: true });
    }
    const data = result.map(course => ({
        id: course._id,
        code: course.code,
        title: course.title,
        description: course.description,
        visible: course.visible,
        coverImage: course.coverImage
    }));
    res.json({
        success: true,
        courses: data
    });
});
const getUserCourseList = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseSchema_1.getUserCourseListSchema, req);
    const { userId } = body;
    const result = await CourseProgress_1.default.find({ userId }).populate("course");
    const data = result.map(x => ({
        id: x.course._id,
        code: x.course.code,
        title: x.course.title,
        description: x.course.description,
        visible: x.course.visible,
        coverImage: x.course.coverImage,
        completed: x.completed,
        updatedAt: x.updatedAt
    }));
    res.json({
        success: true,
        courses: data
    });
});
const getCourse = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseSchema_1.getCourseSchema, req);
    const { courseId, courseCode, includeLessons } = body;
    const currentUserId = req.userId;
    let course = null;
    if (courseId) {
        course = await Course_1.default.findById(courseId);
    }
    else {
        course = await Course_1.default.findOne({ code: courseCode });
    }
    if (!course) {
        res.status(404).json({ error: [{ message: "Course not found" }] });
        return;
    }
    let userProgress = await CourseProgress_1.default.findOne({ course: course.id, userId: currentUserId });
    if (!userProgress) {
        userProgress = await CourseProgress_1.default.create({ course: course.id, userId: currentUserId });
    }
    let lessons = [];
    if (includeLessons === true) {
        lessons = await CourseLesson_1.default.find({ course: course.id }).sort({ index: "asc" });
        const lastUnlockedLessonIndex = await userProgress.getLastUnlockedLessonIndex();
        let lastUnlockedNodeIndex = 1;
        if (userProgress.lastLessonNodeId) {
            const lastLessonNode = await LessonNode_1.default.findById(userProgress.lastLessonNodeId).select("index");
            if (lastLessonNode) {
                lastUnlockedNodeIndex = lastLessonNode.index + 1;
            }
        }
        lessons = lessons.map(lesson => ({
            id: lesson._id,
            title: lesson.title,
            index: lesson.index,
            nodeCount: lesson.nodes,
            unlocked: lesson.index <= lastUnlockedLessonIndex,
            completed: lesson.index < lastUnlockedLessonIndex,
            lastUnlockedNodexIndex: lesson.index < lastUnlockedLessonIndex ? lesson.nodes : lastUnlockedNodeIndex
        }));
    }
    res.json({
        success: true,
        course: {
            id: course._id,
            code: course.code,
            title: course.title,
            description: course.description,
            visible: course.visible,
            coverImage: course.coverImage,
            lessons,
            userProgress: {
                updatedAt: userProgress.updatedAt,
                completed: userProgress.completed
            }
        }
    });
});
const getLesson = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseSchema_1.getLessonSchema, req);
    const { lessonId } = body;
    const currentUserId = req.userId;
    const lesson = await CourseLesson_1.default.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }
    const userProgress = await CourseProgress_1.default.findOne({ course: lesson.course, userId: currentUserId }).populate("lastLessonNodeId", "index lessonId");
    if (!userProgress) {
        res.status(404).json({ error: [{ message: "User progress not found" }] });
        return;
    }
    const lastUnlockedLessonIndex = await userProgress.getLastUnlockedLessonIndex();
    if (lesson.index > lastUnlockedLessonIndex) {
        res.status(400).json({ error: [{ message: "Lesson is not unlocked" }] });
        return;
    }
    const data = {
        id: lesson._id,
        title: lesson.title,
        index: lesson.index,
        nodeCount: lesson.nodes,
        comments: lesson.comments
    };
    let lastUnlockedNodeIndex = 1;
    if (lesson._id.equals(userProgress.lastLessonNodeId?.lessonId)) {
        lastUnlockedNodeIndex = userProgress.lastLessonNodeId.index + 1;
    }
    const nodes = await LessonNode_1.default.find({ lessonId: lesson._id }).sort({ index: "asc" }).select("_id _type index");
    data.nodes = nodes.map(x => ({
        id: x._id,
        index: x.index,
        type: x._type,
        unlocked: lesson.index < lastUnlockedLessonIndex || x.index <= lastUnlockedNodeIndex
    }));
    res.json({
        success: true,
        lesson: data
    });
});
const getLessonNode = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseSchema_1.getLessonNodeSchema, req);
    const { nodeId, mock } = body;
    const currentUserId = req.userId;
    const lessonNode = await LessonNode_1.default.findById(nodeId).populate("lessonId");
    if (!lessonNode) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }
    if (!mock) {
        const userProgress = await CourseProgress_1.default.findOne({ course: lessonNode.lessonId.course, userId: currentUserId });
        if (!userProgress) {
            res.status(404).json({ error: [{ message: "User progress not found" }] });
            return;
        }
        const { unlocked, isLast } = await userProgress.getLessonNodeInfo(lessonNode._id.toString());
        if (!unlocked) {
            res.status(400).json({ error: [{ message: "Node is not unlocked" }] });
            return;
        }
        if (lessonNode._type === LessonNodeTypeEnum_1.default.TEXT && isLast) {
            userProgress.lastLessonNodeId = lessonNode._id;
            await userProgress.save();
        }
    }
    else {
        const user = await User_1.default.findById(currentUserId).select("roles");
        if (!user || ![RolesEnum_1.default.CREATOR, RolesEnum_1.default.ADMIN].some(role => user.roles.includes(role))) {
            res.status(403).json({ error: [{ message: "Unauthorized" }] });
            return;
        }
    }
    const answers = await QuizAnswer_1.default.find({ courseLessonNodeId: lessonNode._id });
    res.json({
        success: true,
        lessonNode: {
            id: lessonNode._id,
            index: lessonNode.index,
            type: lessonNode._type,
            text: lessonNode.text ?? "",
            correctAnswer: lessonNode.correctAnswer,
            answers: answers.map(x => ({
                id: x._id,
                text: x.text,
                correct: x.correct
            }))
        }
    });
});
const solve = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseSchema_1.solveSchema, req);
    const { nodeId, correctAnswer, answers, mock } = body;
    const currentUserId = req.userId;
    const lessonNode = await LessonNode_1.default.findById(nodeId).populate("lessonId");
    if (!lessonNode) {
        res.status(404).json({ error: [{ message: "Lesson node not found" }] });
        return;
    }
    let userProgress = null;
    let isLast = false;
    if (!mock) {
        userProgress = await CourseProgress_1.default.findOne({ course: lessonNode.lessonId.course, userId: currentUserId }).populate("lastLessonNodeId", "index");
        if (!userProgress) {
            res.status(404).json({ error: [{ message: "User progress not found" }] });
            return;
        }
        const nodeInfo = await userProgress.getLessonNodeInfo(lessonNode._id);
        if (!nodeInfo.unlocked) {
            res.status(400).json({ error: [{ message: "Node is not unlocked" }] });
            return;
        }
        isLast = nodeInfo.isLast;
    }
    else {
        const user = await User_1.default.findById(currentUserId).select("roles");
        if (!user || ![RolesEnum_1.default.CREATOR, RolesEnum_1.default.ADMIN].some(role => user.roles.includes(role))) {
            res.status(403).json({ error: [{ message: "Unauthorized" }] });
            return;
        }
    }
    const nodeAnswers = await QuizAnswer_1.default.find({ courseLessonNodeId: lessonNode.id }).select("correct");
    let correct = false;
    switch (lessonNode._type) {
        case LessonNodeTypeEnum_1.default.TEXT:
            correct = true;
            break;
        case LessonNodeTypeEnum_1.default.SINGLECHOICE_QUESTION:
        case LessonNodeTypeEnum_1.default.MULTICHOICE_QUESTION:
            correct = nodeAnswers.every(x => {
                const myAnswer = answers?.find((y) => y.id.toString() === x._id.toString());
                return myAnswer && myAnswer.correct === x.correct;
            });
            break;
        case LessonNodeTypeEnum_1.default.TEXT_QUESTION:
            correct = correctAnswer === lessonNode.correctAnswer;
            break;
    }
    if (!mock && isLast && correct) {
        userProgress.lastLessonNodeId = lessonNode.id;
        await userProgress.save();
    }
    res.json({
        success: true,
        data: { correct }
    });
});
const resetCourseProgress = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseSchema_1.resetCourseProgressSchema, req);
    const { courseId } = body;
    const currentUserId = req.userId;
    const userProgress = await CourseProgress_1.default.findOne({ course: courseId, userId: currentUserId });
    if (!userProgress) {
        res.status(404).json({ error: [{ message: "Course progress not found" }] });
        return;
    }
    userProgress.lastLessonNodeId = null;
    await userProgress.save();
    res.json({ success: true });
});
const getLessonComments = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseSchema_1.getLessonCommentsSchema, req);
    const { lessonId, parentId, index, count, filter, findPostId } = body;
    const currentUserId = req.userId;
    let parentPost = null;
    if (parentId) {
        parentPost = await Post_1.default
            .findById(parentId)
            .populate("user", "name avatarImage countryCode level roles");
    }
    let dbQuery = Post_1.default.find({ lessonId, _type: PostTypeEnum_1.default.LESSON_COMMENT, hidden: false });
    let skipCount = index;
    if (findPostId) {
        const reply = await Post_1.default.findById(findPostId);
        if (!reply) {
            res.status(404).json({ error: [{ message: "Post not found" }] });
            return;
        }
        parentPost = reply.parentId ? await Post_1.default
            .findById(reply.parentId)
            .populate("user", "name avatarImage countryCode level roles")
            : null;
        dbQuery = dbQuery.where({ parentId: parentPost ? parentPost._id : null });
        skipCount = Math.max(0, (await dbQuery
            .clone()
            .where({ createdAt: { $lt: reply.createdAt } })
            .countDocuments()));
    }
    else {
        dbQuery = dbQuery.where({ parentId });
        switch (filter) {
            case 1: // Most popular
                dbQuery = dbQuery.sort({ votes: "desc", createdAt: "desc" });
                break;
            case 2: // Oldest first
                dbQuery = dbQuery.sort({ createdAt: "asc" });
                break;
            case 3: // Newest first
                dbQuery = dbQuery.sort({ createdAt: "desc" });
                break;
        }
    }
    const result = await dbQuery
        .skip(skipCount)
        .limit(count)
        .populate("user", "name avatarImage countryCode level roles");
    const data = (findPostId && parentPost ? [parentPost, ...result] : result).map((x, offset) => ({
        id: x._id,
        parentId: x.parentId,
        message: x.message,
        date: x.createdAt,
        userId: x.user._id,
        userName: x.user.name,
        userAvatar: x.user.avatarImage,
        level: x.user.level,
        roles: x.user.roles,
        votes: x.votes,
        isUpvoted: false,
        answers: x.answers,
        index: (findPostId && parentPost) ? (offset === 0 ? -1 : skipCount + offset - 1) : skipCount + offset,
        attachments: new Array()
    }));
    const promises = data.map((item, i) => [
        Upvote_1.default.findOne({ parentId: item.id, user: currentUserId }).then(upvote => {
            data[i].isUpvoted = !!upvote;
        }),
        PostAttachment_1.default.getByPostId({ post: item.id }).then(attachments => {
            data[i].attachments = attachments;
        })
    ]).flat();
    await Promise.all(promises);
    res.json({ success: true, posts: data });
});
const createLessonComment = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseSchema_1.createLessonCommentSchema, req);
    const { lessonId, message, parentId } = body;
    const currentUserId = req.userId;
    const lesson = await CourseLesson_1.default.findById(lessonId)
        .populate("course", "code title");
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }
    let parentPost = null;
    if (parentId) {
        parentPost = await Post_1.default.findById(parentId);
        if (!parentPost) {
            res.status(404).json({ error: [{ message: "Parent post not found" }] });
            return;
        }
    }
    const reply = await Post_1.default.create({
        _type: PostTypeEnum_1.default.LESSON_COMMENT,
        message,
        lessonId,
        parentId,
        user: currentUserId
    });
    if (parentPost && parentPost.user != currentUserId) {
        await Notification_1.default.sendToUsers([parentPost.user], {
            title: "New reply",
            type: NotificationTypeEnum_1.default.LESSON_COMMENT,
            actionUser: currentUserId,
            message: `{action_user} replied to your comment on lesson "${lesson.title}" to ${lesson.course.title}`,
            lessonId: lesson._id,
            postId: reply._id,
            courseCode: lesson.course.code
        });
    }
    lesson.$inc("comments", 1);
    await lesson.save();
    if (parentPost) {
        parentPost.$inc("answers", 1);
        await parentPost.save();
    }
    const attachments = await PostAttachment_1.default.getByPostId({ post: reply._id });
    res.json({
        success: true,
        post: {
            id: reply._id,
            message: reply.message,
            date: reply.createdAt,
            userId: reply.user,
            parentId: reply.parentId,
            votes: reply.votes,
            answers: reply.answers,
            attachments
        }
    });
});
const editLessonComment = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseSchema_1.editLessonCommentSchema, req);
    const { id, message } = body;
    const currentUserId = req.userId;
    const comment = await Post_1.default.findById(id);
    if (!comment) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }
    if (comment.user != currentUserId) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    comment.message = message;
    await comment.save();
    const attachments = await PostAttachment_1.default.getByPostId({ post: comment._id });
    res.json({
        success: true,
        data: {
            id: comment._id,
            message: comment.message,
            attachments
        }
    });
});
const deleteLessonComment = (0, express_async_handler_1.default)(async (req, res) => {
    const { body } = (0, zodUtils_1.parseWithZod)(courseSchema_1.deleteLessonCommentSchema, req);
    const { id } = body;
    const currentUserId = req.userId;
    const comment = await Post_1.default.findById(id);
    if (!comment) {
        res.status(404).json({ error: [{ message: "Post not found" }] });
        return;
    }
    if (comment.user != currentUserId) {
        res.status(401).json({ error: [{ message: "Unauthorized" }] });
        return;
    }
    const lesson = await CourseLesson_1.default.findById(comment.lessonId);
    if (!lesson) {
        res.status(404).json({ error: [{ message: "Lesson not found" }] });
        return;
    }
    await Post_1.default.deleteAndCleanup({ _id: id });
    res.json({ success: true });
});
const courseController = {
    getCourseList,
    getUserCourseList,
    getCourse,
    getLesson,
    getLessonNode,
    solve,
    resetCourseProgress,
    getLessonComments,
    createLessonComment,
    editLessonComment,
    deleteLessonComment
};
exports.default = courseController;
