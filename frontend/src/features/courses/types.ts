import LessonNodeModeEnum from "../../data/LessonNodeModeEnum";
import LessonNodeTypeEnum from "../../data/LessonNodeTypeEnum";

export interface LessonNodeMinimal {
    id: string;
    index: number;
    type: LessonNodeTypeEnum;
    unlocked?: boolean;
}

export interface LessonNodeDetails extends LessonNodeMinimal {
    mode: LessonNodeModeEnum;
    correctAnswer?: string;
    answers?: {
        id: string;
        correct: boolean;
        text: string;
    }[];
}

export interface LessonDetails<T = LessonProgressInfo> {
    id: string;
    title: string;
    index: number;
    nodeCount: number;
    userProgress: T;
    comments: number;
    nodes?: LessonNodeMinimal[];
}

export interface LessonProgressInfo {
    unlocked: boolean;
    completed: boolean;
    lastUnlockedNodexIndex: number;
}

export interface CourseProgressInfo {
    updatedAt: Date;
    nodesSolved: number;
    completed: boolean;
}

export interface CourseDetails<T = CourseProgressInfo, U = LessonProgressInfo> {
    id: string;
    code: string;
    title: string;
    description: string;
    visible: boolean;
    coverImageUrl: string | null;
    userProgress: T;
    completed?: boolean;
    lessons?: LessonDetails<U>[];
}

export type CourseMinimal = CourseDetails<undefined, undefined>;

export interface EditorCreateCourseData {
    course: {
        id: string;
        code: string;
        title: string;
        visible: boolean;
    }
}

export interface EditorCoursesListData {
    courses: CourseMinimal[];
}

export interface EditorGetCourseData {
    course: CourseMinimal;
}

export interface EditorEditCourseData {
    id: string;
    title: string;
    description: string;
    visible: boolean;
    code: string;
}

export interface EditorGetLessonData {
    lesson: LessonDetails<undefined>;
}

export interface EditorLessonsListData {
    lessons: LessonDetails[];
}

export interface EditorCreateLessonData {
    lesson: {
        id: string;
        title: string;
        index: number;
    }
}

export interface EditorEditLessonData {
    id: string;
    title: string;
    index: number;
}

export interface EditorUploadCourseCoverImageData {
    coverImageFileId: string;
    coverImageUrl: string;
}

export interface EditorCreateLessonNodeData {
    lessonNode: {
        id: string;
        index: number;
        type: LessonNodeTypeEnum;
        mode: LessonNodeModeEnum;
    }
}

export interface EditorGetLessonNodeData {
    lessonNode: LessonNodeDetails;
}

export interface EditorEditLessonNodeData {
    lessonNode: LessonDetails;
}

export interface EditorChangeLessonIndexData {
    index: number;
}

export interface EditorChangeLessonNodeIndexData {
    index: number;
}

export interface LessonNodeJson {
    type: LessonNodeTypeEnum;
    index: number;
    mode: number;
    codeId?: string;
    text: string;
    correctAnswer?: string;
    answers?: Array<{ text: string; correct: boolean }>;
};

export interface CourseLessonJson {
    version: number;
    lesson: { title: string };
    nodes: LessonNodeJson[];
};

export interface CourseJson {
    code: string;
    title: string;
    description: string;
    visible: boolean;
    lessons: LessonNodeJson[];
}

export interface EditorExportCourseLessonData {
    lesson: CourseLessonJson;
}

export interface EditorImportCourseData {
    course: {
        id: string;
        code: string;
        title: string;
        visible: boolean;
    }
}

export interface EditorExportCourseData {
    course: CourseJson;
}

export interface CoursesListData {
    courses: CourseMinimal[];
}

export interface UserCoursesListData {
    courses: CourseMinimal[];
}

export interface GetCourseData {
    course: CourseDetails;
}

export interface GetLessonData {
    lesson: LessonDetails;
}

export interface GetLessonNodeData {
    course: LessonNodeDetails;
}

export interface SolveData {
    correct: boolean;
}