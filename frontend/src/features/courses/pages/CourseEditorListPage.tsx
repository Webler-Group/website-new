import { Button } from "../../../components/ui";
import Course from "../components/Course";
import { useEffect, useState } from "react";
import {useApi} from "../../../context/apiCommunication";
import { EditorCoursesListData } from "../types";
import Loader from "../../../components/Loader";

const CourseEditorListPage = () => {
    const { sendJsonRequest } = useApi();
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCourses();
    }, []);

    const getCourses = async () => {
        setLoading(true);
        const result = await sendJsonRequest<EditorCoursesListData>(`/CourseEditor`, "POST", {});
        if (result.data) {
            setCourses(result.data.courses);
        }
        setLoading(false);
    }

    return (
        <>
            <h2>Course Editor</h2>
            <div className="mt-4 d-flex justify-content-end">
                <Button to="/Courses/Editor/New" size='sm'>Create course</Button>
            </div>
            <div className="my-3">
                {
                    loading ?
                        <Loader />
                        :
                    courses.length == 0 ?
                        <div className="wb-app-empty-list">
                            <h3>Nothing to show</h3>
                        </div>
                        :
                        courses.map(course => {
                            return (
                                <div className="mt-3" key={course.id}>
                                    <Course course={course} isEditor={true} />
                                </div>
                            )
                        })
                }
            </div>
        </>
    );
}

export default CourseEditorListPage;