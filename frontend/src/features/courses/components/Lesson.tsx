import { FaPencil, FaTrash, FaArrowUp, FaArrowDown } from "react-icons/fa6";
import { Link } from "react-router-dom";

interface ILesson {
    id: string;
    title: string;
    index: number;
    nodeCount: number;
    unlocked: boolean;
    completed: boolean;
    lastUnlockedNodexIndex?: number;
    nodes: {
        id: string;
        index: number;
        type: number;
        unlocked: boolean;
    }[];
}

interface LessonProps {
    lesson: ILesson;
    courseId: string;
    onEdit: (id: string, title: string) => void;
    onDelete: (id: string) => void;
    onChangeIndex: (id: string, newIndex: number) => void;
    isFirst: boolean;
    isLast: boolean;
}

const Lesson = ({ lesson, courseId, onEdit, onDelete, onChangeIndex, isFirst, isLast }: LessonProps) => {

    const handleEdit = () => {
        onEdit(lesson.id, lesson.title);
    };

    const handleDelete = () => {
        onDelete(lesson.id);
    };

    const handleMoveUp = () => {
        if (!isFirst) {
            onChangeIndex(lesson.id, lesson.index - 1);
        }
    };

    const handleMoveDown = () => {
        if (!isLast) {
            onChangeIndex(lesson.id, lesson.index + 1);
        }
    };

    return (
        <div className="border p-2 bg-white d-flex justify-content-between gap-3 align-items-center">
            <div className="d-flex gap-2">
                <span
                    className={`wb-comments__options__item ${isFirst ? "text-muted" : ""}`}
                    onClick={handleMoveUp}
                    style={{ cursor: isFirst ? "not-allowed" : "pointer" }}
                >
                    <FaArrowUp />
                </span>
                <span
                    className={`wb-comments__options__item ${isLast ? "text-muted" : ""}`}
                    onClick={handleMoveDown}
                    style={{ cursor: isLast ? "not-allowed" : "pointer" }}
                >
                    <FaArrowDown />
                </span>
                <div>
                    <b className="me-1">{lesson.index}.</b>
                    <Link to={"/Courses/Editor/" + courseId + "/Lesson/" + lesson.id}>
                        {lesson.title}
                    </Link>
                </div>
            </div>
            <div className="d-flex gap-2">
                <span className="wb-comments__options__item" onClick={handleEdit}>
                    <FaPencil />
                </span>
                <span className="wb-comments__options__item" onClick={handleDelete}>
                    <FaTrash />
                </span>
            </div>
        </div>
    );
};

export type {
    ILesson
};

export default Lesson;
