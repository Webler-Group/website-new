import { LinkContainer } from "react-router-bootstrap";
import Course from "../components/Course";
import { Button } from "react-bootstrap";
import { useEffect, useState } from "react";
import {useApi} from "../../../context/apiCommunication";

interface CourseEditorListProps {
    
}

const CourseEditorList = ({}: CourseEditorListProps) => {
    const { sendJsonRequest } = useApi();
    const [courses, setCourses] = useState<any[]>([]);
    const [_, setLoading] = useState(false);

    useEffect(() => {
        getCourses();
    }, []);

    const getCourses = async () => {
        setLoading(true);
        const result = await sendJsonRequest(`/CourseEditor`, "POST", {});
        if (result && result.courses) {
            setCourses(result.courses);
        }
        setLoading(false);
    }

    return (
        <>
            <h2>Courses</h2>
            <div className="mt-4 d-flex justify-content-end">
                <LinkContainer to="/Courses/Editor/New">
                    <Button size='sm'>Create course</Button>
                </LinkContainer>
            </div>
            <div className="my-3">
                {
                    courses.length == 0 ?
                        <div className="wb-discuss-empty-questions">
                            <h3>Nothing to show</h3>
                        </div>
                        :
                        courses.map(course => {
                            return (
                                <div className="mt-2" key={course.id}>
                                    <Course course={course} isEditor={true} />
                                </div>
                            )
                        })
                }
            </div>
        </>
    );
}

export default CourseEditorList;