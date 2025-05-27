import { Response } from "express";
import asyncHandler from "express-async-handler";
import { IAuthRequest } from "../middleware/verifyJWT";
import Course from "../models/Course";
import CourseProgress from "../models/CourseProgress";
import CourseLesson from "../models/CourseLesson";
import LessonNode from "../models/LessonNode";

const getCourseList = asyncHandler(async (req: IAuthRequest, res: Response) => {
    const { excludeUserId } = req.body;

    let result;
    if(typeof excludeUserId !== "undefined") {
        const progresses = await CourseProgress.find({ userId: excludeUserId }).select("courseId");
        const startedCourseIds = progresses.map(x => x.courseId);
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
        .populate("courseId") as any[];

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

    let userProgress = await CourseProgress.findOne({ courseId: course.id, userId: currentUserId });
    if(!userProgress) {
        userProgress = await CourseProgress.create({ courseId: course.id, userId: currentUserId });
    }

    let lessons: any[] = [];
    if (includeLessons === true) {
        lessons = await CourseLesson.find({ courseId: course.id }).sort({ "index": "asc" });
        
        let lastLessonIndex = 1;
        if(userProgress.lastLessonNodeId) {
            const lastLessonNode = await LessonNode.findById(userProgress.lastLessonNodeId);
            if(lastLessonNode) {
                const lastLesson = await CourseLesson.findById(lastLessonNode.lessonId);
                if(lastLesson) {
                    lastLessonIndex = lastLesson.nodes == lastLessonNode.index ? lastLesson.index + 1 : lastLesson.index;
                }
            }
        }

        lessons = lessons.map(lesson => ({
            id: lesson._id,
            title: lesson.title,
            index: lesson.index,
            nodeCount: lesson.nodes,
            unlocked: lesson.index <= lastLessonIndex
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

const courseController = {
    getCourseList,
    getUserCourseList,
    getCourse
};

export default courseController;