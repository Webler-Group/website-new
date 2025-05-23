import { Dropdown } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";

interface ICourse {
    id: string;
    code: string;
    title: string;
    description: string;
    visible: boolean;
    coverImage?: string;
}

interface CourseProps {
    course: ICourse;
}

const Course = ({ course }: CourseProps) => {
    return (
        <LinkContainer to={"/Courses/Editor/" + course.code}>
            <div className="wb-courses-course-card rounded border p-2 bg-white d-flex gap-3 position-relative">
                <div className="wb-courses-course__edit-button">
                    <Dropdown drop="start">
                        <Dropdown.Toggle as={EllipsisDropdownToggle} />
                        <Dropdown.Menu>
                            <LinkContainer to={"/Courses/Editor/Edit/" + course.code}>
                                <Dropdown.Item>Edit</Dropdown.Item>
                            </LinkContainer>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
                <div>
                    <div className="rounded-circle">
                        <img className="wb-courses-course__cover-image" src={"/uploads/courses/" + course.coverImage} />
                    </div>
                </div>
                <div>
                    <h5 style={{ wordBreak: "break-word" }}>{course.title}</h5>
                    <p className="wb-courses-course__description">{course.description}</p>
                </div>
            </div>
        </LinkContainer>
    );
}

export type { ICourse };

export default Course;