import { LinkContainer } from "react-router-bootstrap";
import { ICourse } from "./Course";
import { Dropdown } from "react-bootstrap";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";

interface CourseProps {
    course: ICourse;
    onRestart: (id: string) => void;
}

const MyCourse = ({ course, onRestart }: CourseProps) => {

    const handleRestart = async () => {
        onRestart(course.id);
    }

    return (
        <LinkContainer to={"/Courses/" + course.code}>
            <div className="wb-courses-course-card rounded border p-2 d-sm-flex gap-3 bg-white position-relative">
                <div className="wb-courses-course__edit-button">
                    <Dropdown drop="start">
                        <Dropdown.Toggle as={EllipsisDropdownToggle} />
                        <Dropdown.Menu>
                            <Dropdown.Item onClick={handleRestart}>Restart</Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
                <div className="d-flex justify-content-center">
                    <div className="rounded-circle">
                        <img className="wb-courses-course__cover-image" src={course.coverImage ? "/uploads/courses/" + course.coverImage : "/resources/images/logoicon.svg"} />
                    </div>
                </div>
                <div className="d-flex flex-column align-items-sm-start align-items-center">
                    <h5 style={{ wordBreak: "break-word" }}>{course.title}</h5>
                </div>
            </div>
        </LinkContainer>
    );
}

export default MyCourse;