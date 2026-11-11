import { cx } from "../../../components/ui";
import { FaPencil, FaTrash, FaArrowUp, FaArrowDown, FaFileExport } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { LessonDetails } from "../types";

interface LessonProps {
    lesson: LessonDetails<undefined>;
    courseId: string;
    onEdit: (id: string, title: string) => void;
    onDelete: (id: string) => void;
    onExport: (id: string, title: string) => void;
    onChangeIndex: (id: string, newIndex: number) => void;
    isFirst: boolean;
    isLast: boolean;
}

const Lesson = ({ lesson, courseId, onEdit, onDelete, onExport, onChangeIndex, isFirst, isLast }: LessonProps) => {

    const handleEdit = () => {
        onEdit(lesson.id, lesson.title);
    };

    const handleDelete = () => {
        onDelete(lesson.id);
    };

    const handleExport = () => {
        onExport(lesson.id, lesson.title);
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
                    className={cx("wb-comments-options-item", isFirst ? "text-muted wb-util-not-allowed" : "wb-util-clickable")}
                    onClick={handleMoveUp}
                >
                    <FaArrowUp />
                </span>
                <span
                    className={cx("wb-comments-options-item", isLast ? "text-muted wb-util-not-allowed" : "wb-util-clickable")}
                    onClick={handleMoveDown}
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
                <span className="wb-comments-options-item" onClick={handleExport}>
                    <FaFileExport />
                </span>
                <span className="wb-comments-options-item" onClick={handleEdit}>
                    <FaPencil />
                </span>
                <span className="wb-comments-options-item" onClick={handleDelete}>
                    <FaTrash />
                </span>
            </div>
        </div>
    );
};

export default Lesson;
