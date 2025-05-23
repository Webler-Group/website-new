import { FaPencil, FaTrash } from "react-icons/fa6";
import { Link } from "react-router-dom";

interface ILesson {
    id: string;
    title: string;
    index: number;
    nodeCount: number;
    nodes: {
        id: string;
        index: number;
        type: number;
    }[]
}

interface LessonProps {
    lesson: ILesson;
    courseCode: string;
    onEdit: (id: string, title: string) => void;
    onDelete: (id: string) => void;
}

const Lesson = ({ lesson, courseCode, onEdit, onDelete }: LessonProps) => {

    const handleEdit = () => {
        onEdit(lesson.id, lesson.title);
    }

    const handleDelete = () => {
        onDelete(lesson.id);
    }

    return (
        <div className="border p-2 bg-white d-flex justify-content-between gap-3">
            <div>
                <b className="me-2">{lesson.index}.</b>
                <Link to={"/Courses/Editor/" + courseCode + "/Lessons/" + lesson.id}>
                    {lesson.title}
                </Link>
            </div>
            <div className="d-flex gap-2">
                <span className="wb-user-comment__options__item" onClick={handleEdit}>
                    <FaPencil />
                </span>
                <span className="wb-user-comment__options__item" onClick={handleDelete}>
                    <FaTrash />
                </span>
            </div>
        </div>
    );
}

export type {
    ILesson
}

export default Lesson;