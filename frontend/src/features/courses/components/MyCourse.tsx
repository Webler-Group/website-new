import { LinkContainer } from "react-router-bootstrap";
import { ICourse } from "./Course";
import { Dropdown } from "react-bootstrap";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";

interface CourseProps {
    course: ICourse;
}

const MyCourse = ({ course }: CourseProps) => {
    return (
        <LinkContainer to={"/Courses/" + course.code}>
            <div className="wb-courses-course-card rounded border p-2 bg-white position-relative">
                <div className="wb-courses-course__edit-button">
                    <Dropdown drop="start">
                        <Dropdown.Toggle as={EllipsisDropdownToggle} />
                        <Dropdown.Menu>
                            <Dropdown.Item>Restart</Dropdown.Item>
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
                </div>
            </div>
        </LinkContainer>
    );
}

export default MyCourse;