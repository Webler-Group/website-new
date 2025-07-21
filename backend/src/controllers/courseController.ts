import { Response } from "express";
import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import Course from "../models/Course";
import CourseProgress from "../models/CourseProgress";
import CourseLesson from "../models/CourseLesson";
import LessonNode from "../models/LessonNode";
import QuizAnswer from "../models/QuizAnswer";
import User from "../models/User";

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
        nodeCount: lesson.nodes
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

        if (lessonNode._type == 1 && isLast) {
            userProgress.lastLessonNodeId = lessonNode._id;
            await userProgress.save();
        }
    } else {
        const user = await User.findById(currentUserId).select("roles");
        if (!user || !["Creator", "Admin"].some(role => user.roles.includes(role))) {
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
        if (!user || !["Creator", "Admin"].some(role => user.roles.includes(role))) {
            res.status(403).json({ message: "Unauthorized" });
            return;
        }
    }

    const nodeAnswers = await QuizAnswer.find({ courseLessonNodeId: lessonNode.id }).select("correct");

    let correct = false;
    switch (lessonNode._type) {
        case 1: {
            correct = true;
            break;
        }
        case 2: case 3: {
            correct = nodeAnswers.every(x => {
                const myAnswer = answers.find((y: any) => y.id == x._id);
                return myAnswer && myAnswer.correct == x.correct;
            });
            break;
        }
        case 4: {
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

const courseController = {
    getCourseList,
    getUserCourseList,
    getCourse,
    getLesson,
    getLessonNode,
    solve,
    resetCourseProgress
};

export default courseController;