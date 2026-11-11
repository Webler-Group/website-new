import { Badge, Dropdown } from "../../../components/ui";
import { useNavigate } from "react-router-dom";
import { FaEyeSlash, FaUsers } from "react-icons/fa6";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";
import { CourseMinimal } from "../types";

interface CourseProps {
    course: CourseMinimal;
    isEditor?: boolean;
    isMyCourse?: boolean;
    onRestart?: (id: string) => void;
}

const Course = ({ course, isEditor, isMyCourse, onRestart }: CourseProps) => {
    const handleRestart = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onRestart?.(course.id);
    };

    const navigate = useNavigate();

    const to = isEditor
        ? "/Courses/Editor/" + course.id
        : "/Courses/" + course.code;

    return (
        <div
            role="link"
            className="wb-courses-course-card wb-util-clickable rounded border p-2 bg-white d-sm-flex gap-3 position-relative"
            onClick={(e) => {
                // Clicks handled by the course menu call preventDefault
                if (!e.defaultPrevented) navigate(to);
            }}
        >

                {isMyCourse && (
                    <div className="wb-courses-course-edit-button">
                        <Dropdown drop="start">
                            <Dropdown.Toggle as={EllipsisDropdownToggle} />
                            <Dropdown.Menu>
                                <Dropdown.Item onClick={handleRestart}>
                                    Restart
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                )}

                <div className="d-flex justify-content-center">
                    <div className="rounded-circle">
                        <img
                            className="wb-courses-course-cover-image"
                            src={course.coverImageUrl || "/resources/images/logoicon.svg"}
                            alt="Cover image"
                        />
                    </div>
                </div>

                <div className="d-flex flex-column align-items-sm-start align-items-center flex-grow-1">
                    <h5 className="text-break">
                        {course.title} {!course.visible && <FaEyeSlash />}
                    </h5>

                    {!isMyCourse && (
                        <p className="wb-courses-course-description">{course.description}</p>
                    )}

                    {isMyCourse && (
                        <Badge bg={course.completed ? "success" : "info"} text={course.completed ? undefined : "dark"}>
                            {course.completed ? "Completed" : "In Progress"}
                        </Badge>
                    )}

                    {!isEditor && (
                        <div className="mt-auto pt-2 align-self-sm-end align-self-center">
                            <span className="d-flex align-items-center gap-1 text-muted">
                                <FaUsers /> {course.participants}
                            </span>
                        </div>
                    )}
                </div>

        </div>
    );
};

export default Course;