import { Response } from "express";
import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import Course from "../models/Course";
import CourseProgress from "../models/CourseProgress";
import CourseLesson from "../models/CourseLesson";
import LessonNode from "../models/LessonNode";
import QuizAnswer from "../models/QuizAnswer";
import User from "../models/User";
import RolesEnum from "../data/RolesEnum";
import LessonNodeTypeEnum from "../data/LessonNodeTypeEnum";
import Post from "../models/Post";
import PostAttachment from "../models/PostAttachment";
import Notification from "../models/Notification";
import NotificationTypeEnum from "../data/NotificationTypeEnum";
import { sendToUsers } from "../services/pushService";
import PostTypeEnum from "../data/PostTypeEnum";
import Upvote from "../models/Upvote";

const getCourseList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { excludeUserId } = req.body;

    let result;
    if (typeof excludeUserId !== "undefined") {
        const progresses = await CourseProgress.find({ userId: excludeUserId }).select("course");
        const startedCourseIds = progresses.map(x => x.course);
        result = await Course.find({
            visible: true,
            _id: { $nin: startedCourseIds }
        });
    } else {
        result = await Course.find({ visible: true });
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

const getUserCourseList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { userId } = req.body;

    const result = await CourseProgress.find({ userId })
        .populate("course") as any[];

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

const getCourse = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { courseId, courseCode, includeLessons } = req.body;
    const currentUserId = req.userId;

    let course = null;
    if (courseId) {
        course = await Course.findById(courseId);
    } else {
        course = await Course.findOne({ code: courseCode });
    }

    if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
    }

    let userProgress = await CourseProgress.findOne({ course: course.id, userId: currentUserId });
    if (!userProgress) {
        userProgress = await CourseProgress.create({ course: course.id, userId: currentUserId });
    }

    let lessons: any[] = [];
    if (includeLessons === true) {
        lessons = await CourseLesson.find({ course: course.id }).sort({ "index": "asc" });

        const lastUnlockedLessonIndex = await userProgress.getLastUnlockedLessonIndex();

        let lastUnlockedNodeIndex = 1;
        if(userProgress.lastLessonNodeId) {
            const lastLessonNode = await LessonNode.findById(userProgress.lastLessonNodeId).select("index");
            if(lastLessonNode) {
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

const getLesson = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { lessonId } = req.body;
    const currentUserId = req.userId;

    const lesson = await CourseLesson.findById(lessonId);
    if (!lesson) {
        res.status(404).json({ message: "Lesson not found" });
        return;
    }

    const userProgress = await CourseProgress.findOne({ course: lesson.course, userId: currentUserId }).populate("lastLessonNodeId", "index lessonId") as any;
    if (!userProgress) {
        res.status(404).json({ message: "User progress not found" });
        return;
    }

    const lastUnlockedLessonIndex = await userProgress.getLastUnlockedLessonIndex();
    if (lesson.index > lastUnlockedLessonIndex) {
        res.status(400).json({ message: "Lesson is not unlocked" });
        return;
    }

    const data: any = {
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

    const nodes = await LessonNode.find({ lessonId: lesson._id }).sort({ index: "asc" }).select("_id _type index");
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

const getLessonNode = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { nodeId, mock } = req.body;
    const currentUserId = req.userId;

    const lessonNode = await LessonNode.findById(nodeId)
        .populate("lessonId") as any;
    if (!lessonNode) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }

    if (!mock) {
        const userProgress = await CourseProgress.findOne({ course: lessonNode.lessonId.course, userId: currentUserId });
        if (!userProgress) {
            res.status(404).json({ message: "User progress not found" });
            return;
        }

        const { unlocked, isLast } = await userProgress.getLessonNodeInfo(lessonNode._id);
        if (!unlocked) {
            res.status(400).json({ message: "Node is not unlocked" });
            return;
        }

        if (lessonNode._type == LessonNodeTypeEnum.TEXT && isLast) {
            userProgress.lastLessonNodeId = lessonNode._id;
            await userProgress.save();
        }
    } else {
        const user = await User.findById(currentUserId).select("roles");
        if (!user || ![RolesEnum.CREATOR, RolesEnum.ADMIN].some(role => user.roles.includes(role))) {
            res.status(403).json({ message: "Unauthorized" });
            return;
        }
    }

    const answers = await QuizAnswer.find({ courseLessonNodeId: lessonNode._id });

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

const solve = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { nodeId, correctAnswer, answers, mock } = req.body;
    const currentUserId = req.userId;

    const lessonNode = await LessonNode.findById(nodeId)
        .populate("lessonId") as any;
    if (!lessonNode) {
        res.status(404).json({ message: "Lesson node not found" });
        return;
    }

    let userProgress = null;
    let isLast = false;
    if (!mock) {
        userProgress = await CourseProgress.findOne({ course: lessonNode.lessonId.course, userId: currentUserId }).populate("lastLessonNodeId", "index") as any;
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
    } else {
        const user = await User.findById(currentUserId).select("roles");
        if (!user || ![RolesEnum.CREATOR, RolesEnum.ADMIN].some(role => user.roles.includes(role))) {
            res.status(403).json({ message: "Unauthorized" });
            return;
        }
    }

    const nodeAnswers = await QuizAnswer.find({ courseLessonNodeId: lessonNode.id }).select("correct");

    let correct = false;
    switch (lessonNode._type) {
        case LessonNodeTypeEnum.TEXT: {
            correct = true;
            break;
        }
        case LessonNodeTypeEnum.SINGLECHOICE_QUESTION: case LessonNodeTypeEnum.MULTICHOICE_QUESTION: {
            correct = nodeAnswers.every(x => {
                const myAnswer = answers.find((y: any) => y.id == x._id);
                return myAnswer && myAnswer.correct == x.correct;
            });
            break;
        }
        case LessonNodeTypeEnum.TEXT_QUESTION: {
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

const resetCourseProgress = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { courseId } = req.body;
    const currentUserId = req.userId;

    const userProgress = await CourseProgress.findOne({ course: courseId, userId: currentUserId });
    if (!userProgress) {
        res.status(404).json({ message: "Course progress not found" });
        return;
    }

    userProgress.lastLessonNodeId = null as any;
    userProgress.save();

    res.json({
        success: true
    });
});

const getLessonComments = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { lessonId, parentId, index, count, filter, findPostId } = req.body;

    if (typeof filter !== "number" || typeof index !== "number" || index < 0 || typeof count !== "number" || count < 1 || count > 100) {
        res.status(400).json({ message: "Some fileds are missing" });
        return
    }

    let parentPost: any = null;
    if (parentId) {
        parentPost = await Post
            .findById(parentId)
            .populate("user", "name avatarImage countryCode level roles");
    }

    let dbQuery = Post.find({ lessonId, _type: PostTypeEnum.LESSON_COMMENT, hidden: false });

    let skipCount = index;

    if (findPostId) {

        const reply = await Post.findById(findPostId);

        if (reply === null) {
            res.status(404).json({ message: "Post not found" })
            return
        }

        parentPost = reply.parentId ? await Post
            .findById(reply.parentId)
            .populate("user", "name avatarImage countryCode level roles")
            :
            null;

        dbQuery = dbQuery.where({ parentId: parentPost ? parentPost._id : null })

        skipCount = Math.max(0, (await dbQuery
            .clone()
            .where({ createdAt: { $lt: reply.createdAt } })
            .countDocuments()));

        dbQuery = dbQuery
            .sort({ createdAt: "asc" })
    }
    else {
        dbQuery = dbQuery.where({ parentId });

        switch (filter) {
            // Most popular
            case 1: {
                dbQuery = dbQuery
                    .sort({ votes: "desc", createdAt: "desc" })
                break;
            }
            // Oldest first
            case 2: {
                dbQuery = dbQuery
                    .sort({ createdAt: "asc" })
                break;
            }
            // Newest first
            case 3: {
                dbQuery = dbQuery
                    .sort({ createdAt: "desc" })
                break;
            }
            default:
                throw new Error("Unknown filter");
        }
    }

    const result = await dbQuery
        .skip(skipCount)
        .limit(count)
        .populate("user", "name avatarImage countryCode level roles") as any[];

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
    }))

    let promises = [];

    for (let i = 0; i < data.length; ++i) {
        /*promises.push(Upvote.countDocuments({ parentId: data[i].id }).then(count => {
            data[i].votes = count;
        }));*/
        if (currentUserId) {
            promises.push(Upvote.findOne({ parentId: data[i].id, user: currentUserId }).then(upvote => {
                data[i].isUpvoted = !(upvote === null);
            }));
        }
        promises.push(PostAttachment.getByPostId({ post: data[i].id }).then(attachments => data[i].attachments = attachments));
    }

    await Promise.all(promises);

    res.status(200).json({ posts: data })
});

const createLessonComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { lessonId, message, parentId } = req.body;

    const lesson = await CourseLesson.findById(lessonId)
        .populate<{ course: any }>("course", "code");
    if (lesson === null) {
        res.status(404).json({ message: "Code not found" });
        return
    }

    let parentPost = null;
    if (parentId !== null) {
        parentPost = await Post.findById(parentId);
        if (parentPost === null) {
            res.status(404).json({ message: "Parent post not found" });
            return
        }
    }

    const reply = await Post.create({
        _type: PostTypeEnum.LESSON_COMMENT,
        message,
        lessonId,
        parentId,
        user: currentUserId
    })

    const usersToNotify = new Set<string>();
    if (parentPost !== null) {
        usersToNotify.add(parentPost.user.toString())
    }
    usersToNotify.delete(currentUserId!);

    for (let userToNotify of usersToNotify) {

        await Notification.create({
            _type: NotificationTypeEnum.LESSON_COMMENT,
            user: userToNotify,
            actionUser: currentUserId,
            message: `{action_user} replied to your comment on "${lesson.title}"`,
            lessonId: lesson._id,
            postId: reply._id,
            courseCode: lesson.course.code
        })
    }

    lesson.$inc("comments", 1)
    await lesson.save();

    if (parentPost) {
        parentPost.$inc("answers", 1)
        await parentPost.save();
    }

    const attachments = await PostAttachment.getByPostId({ post: reply._id })

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
    })
});

const editLessonComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { id, message } = req.body;

    if (typeof message === "undefined") {
        res.status(400).json({ message: "Some fields are missing" })
        return
    }

    const comment = await Post.findById(id);

    if (comment === null) {
        res.status(404).json({ message: "Post not found" })
        return
    }

    if (currentUserId != comment.user) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    comment.message = message;

    try {
        await comment.save();

        const attachments = await PostAttachment.getByPostId({ post: comment._id })

        res.json({
            success: true,
            data: {
                id: comment._id,
                message: comment.message,
                attachments
            }
        })
    }
    catch (err: any) {
        res.json({
            success: false,
            error: err,
            data: null
        })
    }

});

const deleteLessonComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const currentUserId = req.userId;
    const { id } = req.body;

    const comment = await Post.findById(id);

    if (comment === null) {
        res.status(404).json({ message: "Post not found" })
        return
    }

    if (currentUserId != comment.user) {
        res.status(401).json({ message: "Unauthorized" });
        return
    }

    const lesson = await CourseLesson.findById(comment.codeId);
    if (lesson === null) {
        res.status(404).json({ message: "Lesson not found" })
        return
    }

    try {

        await Post.deleteAndCleanup({ _id: id });

        res.json({ success: true });
    }
    catch (err: any) {
        res.json({ success: false, error: err })
    }
})

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

export default courseController;