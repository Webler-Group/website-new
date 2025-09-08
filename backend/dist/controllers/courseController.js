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
const pushService_1 = require("../services/pushService");
const PostTypeEnum_1 = __importDefault(require("../data/PostTypeEnum"));
const Upvote_1 = __importDefault(require("../models/Upvote"));
const getCourseList = (0, express_async_handler_1.default)(async (req, res) => {
    const { excludeUserId } = req.body;
    let result;
    if (typeof excludeUserId !== "undefined") {
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
        courses: data
    });
});
const getUserCourseList = (0, express_async_handler_1.default)(async (req, res) => {
    const { userId } = req.body;
    const result = await CourseProgress_1.default.find({ userId })
        .populate("course");
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
        courses: data
    });
});
const getCourse = (0, express_async_handler_1.default)(async (req, res) => {
    const { courseId, courseCode, includeLessons } = req.body;
    const currentUserId = req.userId;
    let course = null;
    if (courseId) {
        course = await Course_1.default.findById(courseId);
    }
    else {
        course = await Course_1.default.findOne({ code: courseCode });
    }
    if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
    }
    let userProgress = await CourseProgress_1.default.findOne({ course: course.id, userId: currentUserId });
    if (!userProgress) {
        userProgress = await CourseProgress_1.default.create({ course: course.id, userId: currentUserId });
    }
    let lessons = [];
    if (includeLessons === true) {
        lessons = await CourseLesson_1.default.find({ course: course.id }).sort({ "index": "asc" });
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
    const { lessonId } = req.body;
    const currentUserId = req.userId;
    const lesson = await CourseLesson_1.default.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
    }
    const userProgress = await CourseProgress_1.default.findOne({ course: lesson.course, userId: currentUserId }).populate("lastLessonNodeId", "index lessonId");
    if (!userProgress) {
        res.status(404).json({ message: "User progress not found" });
        return;
    }
    const lastUnlockedLessonIndex = await userProgress.getLastUnlockedLessonIndex();
    if (lesson.index > lastUnlockedLessonIndex) {
        res.status(400).json({ message: "Lesson is not unlocked" });
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
        lesson: data
    });
});
const getLessonNode = (0, express_async_handler_1.default)(async (req, res) => {
    const { nodeId, mock } = req.body;
    const currentUserId = req.userId;
    const lessonNode = await LessonNode_1.default.findById(nodeId)
        .populate("lessonId");
    if (!lessonNode) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }
    if (!mock) {
        const userProgress = await CourseProgress_1.default.findOne({ course: lessonNode.lessonId.course, userId: currentUserId });
        if (!userProgress) {
            res.status(404).json({ message: "User progress not found" });
            return;
        }
        const { unlocked, isLast } = await userProgress.getLessonNodeInfo(lessonNode._id);
        if (!unlocked) {
            res.status(400).json({ message: "Node is not unlocked" });
            return;
        }
        if (lessonNode._type == LessonNodeTypeEnum_1.default.TEXT && isLast) {
            userProgress.lastLessonNodeId = lessonNode._id;
            await userProgress.save();
        }
    }
    else {
        const user = await User_1.default.findById(currentUserId).select("roles");
        if (!user || ![RolesEnum_1.default.CREATOR, RolesEnum_1.default.ADMIN].some(role => user.roles.includes(role))) {
            res.status(403).json({ message: "Unauthorized" });
            return;
        }
    }
    const answers = await QuizAnswer_1.default.find({ courseLessonNodeId: lessonNode._id });
    res.json({
        lessonNode: {
            id: lessonNode._id,
            index: lessonNode.index,
            type: lessonNode._type,
            text: lessonNode.text,
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
    const { nodeId, correctAnswer, answers, mock } = req.body;
    const currentUserId = req.userId;
    const lessonNode = await LessonNode_1.default.findById(nodeId)
        .populate("lessonId");
    if (!lessonNode) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }
    let userProgress = null;
    let isLast = false;
    if (!mock) {
        userProgress = await CourseProgress_1.default.findOne({ course: lessonNode.lessonId.course, userId: currentUserId }).populate("lastLessonNodeId", "index");
        if (!userProgress) {
            res.status(404).json({ message: "User progress not found" });
            return;
        }
        const nodeInfo = await userProgress.getLessonNodeInfo(lessonNode._id);
        if (!nodeInfo.unlocked) {
            res.status(400).json({ message: "Node is not unlocked" });
            return;
        }
        isLast = nodeInfo.isLast;
    }
    else {
        const user = await User_1.default.findById(currentUserId).select("roles");
        if (!user || ![RolesEnum_1.default.CREATOR, RolesEnum_1.default.ADMIN].some(role => user.roles.includes(role))) {
            res.status(403).json({ message: "Unauthorized" });
            return;
        }
    }
    const nodeAnswers = await QuizAnswer_1.default.find({ courseLessonNodeId: lessonNode.id }).select("correct");
    let correct = false;
    switch (lessonNode._type) {
        case LessonNodeTypeEnum_1.default.TEXT: {
            correct = true;
            break;
        }
        case LessonNodeTypeEnum_1.default.SINGLECHOICE_QUESTION:
        case LessonNodeTypeEnum_1.default.MULTICHOICE_QUESTION: {
            correct = nodeAnswers.every(x => {
                const myAnswer = answers.find((y) => y.id == x._id);
                return myAnswer && myAnswer.correct == x.correct;
            });
            break;
        }
        case LessonNodeTypeEnum_1.default.TEXT_QUESTION: {
            correct = correctAnswer == lessonNode.correctAnswer;
            break;
        }
    }
    if (!mock && isLast && correct) {
        userProgress.lastLessonNodeId = lessonNode.id;
        await userProgress.save();
    }
    res.json({
        success: true,
        data: {
            correct
        }
    });
});
const resetCourseProgress = (0, express_async_handler_1.default)(async (req, res) => {
    const { courseId } = req.body;
    const currentUserId = req.userId;
    const userProgress = await CourseProgress_1.default.findOne({ course: courseId, userId: currentUserId });
    if (!userProgress) {
        res.status(404).json({ message: "Course progress not found" });
        return;
    }
    userProgress.lastLessonNodeId = null;
    userProgress.save();
    res.json({
        success: true
    });
});
const getLessonComments = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { lessonId, parentId, index, count, filter, findPostId } = req.body;
    if (typeof filter !== "number" || typeof index !== "number" || index < 0 || typeof count !== "number" || count < 1 || count > 100) {
        res.status(400).json({ message: "Some fileds are missing" });
        return;
    }
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
        if (reply === null) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        parentPost = reply.parentId ? await Post_1.default
            .findById(reply.parentId)
            .populate("user", "name avatarImage countryCode level roles")
            :
                null;
        dbQuery = dbQuery.where({ parentId: parentPost ? parentPost._id : null });
        skipCount = Math.max(0, (await dbQuery
            .clone()
            .where({ createdAt: { $lt: reply.createdAt } })
            .countDocuments()));
        dbQuery = dbQuery
            .sort({ createdAt: "asc" });
    }
    else {
        dbQuery = dbQuery.where({ parentId });
        switch (filter) {
            // Most popular
            case 1: {
                dbQuery = dbQuery
                    .sort({ votes: "desc", createdAt: "desc" });
                break;
            }
            // Oldest first
            case 2: {
                dbQuery = dbQuery
                    .sort({ createdAt: "asc" });
                break;
            }
            // Newest first
            case 3: {
                dbQuery = dbQuery
                    .sort({ createdAt: "desc" });
                break;
            }
            default:
                throw new Error("Unknown filter");
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
        index: (findPostId && parentPost) ?
            offset === 0 ? -1 : skipCount + offset - 1 :
            skipCount + offset,
        attachments: new Array()
    }));
    let promises = [];
    for (let i = 0; i < data.length; ++i) {
        /*promises.push(Upvote.countDocuments({ parentId: data[i].id }).then(count => {
            data[i].votes = count;
        }));*/
        if (currentUserId) {
            promises.push(Upvote_1.default.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
                data[i].isUpvoted = !(upvote === null);
            }));
        }
        promises.push(PostAttachment_1.default.getByPostId({ post: data[i].id }).then(attachments => data[i].attachments = attachments));
    }
    await Promise.all(promises);
    res.status(200).json({ posts: data });
});
const createLessonComment = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { lessonId, message, parentId } = req.body;
    const lesson = await CourseLesson_1.default.findById(lessonId)
        .populate("course", "code title");
    if (lesson === null) {
        res.status(404).json({ message: "Code not found" });
        return;
    }
    let parentPost = null;
    if (parentId !== null) {
        parentPost = await Post_1.default.findById(parentId);
        if (parentPost === null) {
            res.status(404).json({ message: "Parent post not found" });
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
    const usersToNotify = new Set();
    if (parentPost !== null) {
        usersToNotify.add(parentPost.user.toString());
    }
    usersToNotify.delete(currentUserId);
    const currentUserName = (await User_1.default.findById(currentUserId, "name")).name;
    await (0, pushService_1.sendToUsers)(Array.from(usersToNotify), {
        title: "New reply",
        body: `${currentUserName} replied to your comment on lesson "${lesson.title}" to ${lesson.course.title}`
    }, "codes");
    for (let userToNotify of usersToNotify) {
        await Notification_1.default.create({
            _type: NotificationTypeEnum_1.default.LESSON_COMMENT,
            user: userToNotify,
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
    const currentUserId = req.userId;
    const { id, message } = req.body;
    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" });
        return;
    }
    const comment = await Post_1.default.findById(id);
    if (comment === null) {
        res.status(404).json({ message: "Post not found" });
        return;
    }
    if (currentUserId != comment.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    comment.message = message;
    try {
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
    }
    catch (err) {
        res.json({
            success: false,
            error: err?.message,
            data: null
        });
    }
});
const deleteLessonComment = (0, express_async_handler_1.default)(async (req, res) => {
    const currentUserId = req.userId;
    const { id } = req.body;
    const comment = await Post_1.default.findById(id);
    if (comment === null) {
        res.status(404).json({ message: "Post not found" });
        return;
    }
    if (currentUserId != comment.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const lesson = await CourseLesson_1.default.findById(comment.lessonId);
    if (lesson === null) {
        res.status(404).json({ message: "Lesson not found" });
        return;
    }
    try {
        await Post_1.default.deleteAndCleanup({ _id: id });
        res.json({ success: true });
    }
    catch (err) {
        console.log(err);
        res.json({ success: false, error: err?.message });
    }
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
