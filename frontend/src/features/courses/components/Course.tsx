import { LinkContainer } from "react-router-bootstrap";
import { FaEyeSlash } from "react-icons/fa6";

interface ICourse {
    id: string;
    code: string;
    title: string;
    description: string;
    visible: boolean;
    coverImageUrl?: string | null;
    completed?: boolean;
    updatedAt?: string;
}

interface CourseProps {
    course: ICourse;
    isEditor: boolean;
}

const Course = ({ course, isEditor }: CourseProps) => {
    return (
        <LinkContainer to={isEditor ? "/Courses/Editor/" + course.id : "/Courses/" + course.code}>
            <div className="wb-courses-course-card rounded border p-2 bg-white d-sm-flex gap-3 position-relative">
                <div className="d-flex justify-content-center">
                    <div className="rounded-circle">
                        <img className="wb-courses-course__cover-image" src={course.coverImageUrl || "/resources/images/logoicon.svg"} alt="Cover image" />
                    </div>
                </div>
                <div className="d-flex flex-column align-items-sm-start align-items-center">
                    <h5 style={{ wordBreak: "break-word" }}>{course.title} {!course.visible && <FaEyeSlash />}</h5>
                    <p className="wb-courses-course__description">{course.description}</p>
                </div>
            </div>
        </LinkContainer>
    );
}

export type { ICourse };

export default Course;