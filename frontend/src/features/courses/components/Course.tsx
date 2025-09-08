import { Dropdown } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";
import { FaEyeSlash } from "react-icons/fa6";

interface ICourse {
    id: string;
    code: string;
    title: string;
    description: string;
    visible: boolean;
    coverImage?: string;
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
                {
                    isEditor &&
                    <div className="wb-courses-course__edit-button">
                        <Dropdown drop="start">
                            <Dropdown.Toggle as={EllipsisDropdownToggle} />
                            <Dropdown.Menu>
                                <LinkContainer to={"/Courses/Editor/Edit/" + course.id}>
                                    <Dropdown.Item>Edit</Dropdown.Item>
                                </LinkContainer>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                }
                <div className="d-flex justify-content-center">
                    <div className="rounded-circle">
                        <img className="wb-courses-course__cover-image" src={course.coverImage ? "/uploads/courses/" + course.coverImage : "/resources/images/logoicon.png"} />
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