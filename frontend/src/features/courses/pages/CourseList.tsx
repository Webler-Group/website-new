import Course, { ICourse } from "../components/Course";
import { Container } from "react-bootstrap";
import { useEffect, useState } from "react";
import ApiCommunication from "../../../helpers/apiCommunication";
import PageTitle from "../../../layouts/PageTitle";
import { useAuth } from "../../auth/context/authContext";
import MyCourse from "../components/MyCourse";

interface CourseListProps {

}

const CourseList = ({ }: CourseListProps) => {

    const [courses, setCourses] = useState<ICourse[]>([]);
    const [myCourses, setMyCourses] = useState<ICourse[]>([]);
    const [_, setLoading] = useState(false);
    const { userInfo } = useAuth();

    PageTitle("Webler - Courses");

    useEffect(() => {
        getCourses();
    }, []);

    const getCourses = async () => {
        setLoading(true);
        const result = await ApiCommunication.sendJsonRequest(`/Courses`, "POST", {
            excludeUserId: userInfo?.id
        });
        if (result && result.courses) {
            setCourses(result.courses);
        }
        if (userInfo) {
            const result = await ApiCommunication.sendJsonRequest(`/Courses/GetUserCourses`, "POST", {
                userId: userInfo.id
            });
            if (result && result.courses) {
                setMyCourses(result.courses);
            }
        }
        setLoading(false);
    }

    return (
        <Container>
            <div className="wb-courses-main p-4">
                {
                    userInfo !== null && myCourses.length > 0 &&
                    <>
                        <div className="d-flex justify-content-center">
                            <h2>My Courses</h2>
                        </div>
                        <div className="my-3">
                            {
                                myCourses.map(course => {
                                    return (
                                        <div className="mt-2" key={course.id}>
                                            <MyCourse course={course} />
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </>
                }
                <div className="d-flex justify-content-center">
                    <h2>Explore our courses</h2>
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
                                        <Course course={course} isEditor={false} />
                                    </div>
                                )
                            })
                    }
                </div>
            </div>
        </Container>
    );
}

export default CourseList;