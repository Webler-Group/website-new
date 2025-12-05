import Course, { ICourse } from "../components/Course";
import { Button, Container, Modal } from "react-bootstrap";
import { useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { useAuth } from "../../auth/context/authContext";
import MyCourse from "../components/MyCourse";
import { Helmet } from "react-helmet-async";

const CourseListPage = () => {
    const { sendJsonRequest } = useApi();
    const [courses, setCourses] = useState<ICourse[]>([]);
    const [myCourses, setMyCourses] = useState<ICourse[]>([]);
    const [_, setLoading] = useState(false);
    const { userInfo } = useAuth();
    const [resetModalVisible, setResetModalVisible] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

    useEffect(() => {
        getCourses();
    }, []);

    const getCourses = async () => {
        setLoading(true);
        const result = await sendJsonRequest(`/Courses`, "POST", {
            excludeUserId: userInfo?.id
        });
        if (result && result.courses) {
            setCourses(result.courses);
        }
        if (userInfo) {
            const result = await sendJsonRequest(`/Courses/GetUserCourses`, "POST", {
                userId: userInfo.id
            });
            if (result && result.courses) {
                setMyCourses(result.courses);
            }
        }
        setLoading(false);
    }

    const closeResetModal = () => {
        setResetModalVisible(false);
    }

    const handleRestartCourseProgress = async () => {
        if (!selectedCourseId) {
            return;
        }
        const result = await sendJsonRequest("/Courses/ResetCourseProgress", "POST", {
            courseId: selectedCourseId
        });
        if (result?.success) {

        }
        setResetModalVisible(false);
    }

    const onRestartCourse = (courseId: string) => {
        setSelectedCourseId(courseId);
        setResetModalVisible(true);
    }

    return (
        <>
            <Helmet> <title>Courses | Webler Codes</title> <meta name="description" content="Learn by doing with Webler’s interactive coding courses. Practice with hands-on lessons, quizzes, and real-world projects at your own pace." /> </Helmet>
            <Modal show={resetModalVisible} onHide={closeResetModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>Course progress will be restarted.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeResetModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleRestartCourseProgress}>Restart</Button>
                </Modal.Footer>
            </Modal>

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
                                            <div className="mt-3" key={course.id}>
                                                <MyCourse course={course} onRestart={onRestartCourse} />
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
                                <div className="wb-empty-list">
                                    <h3>Nothing to show</h3>
                                </div>
                                :
                                courses.map(course => {
                                    return (
                                        <div className="mt-3" key={course.id}>
                                            <Course course={course} isEditor={false} />
                                        </div>
                                    )
                                })
                        }
                    </div>
                </div>
            </Container>
        </>
    );
}

export default CourseListPage;