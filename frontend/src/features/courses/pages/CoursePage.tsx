import { useEffect, useState } from "react";
import { Container, Card, Button, ProgressBar, Row, Col, Badge } from "react-bootstrap";
import { useParams, Link } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import { ILesson } from "../components/Lesson";
import { FaCircle, FaCirclePlay, FaLock } from "react-icons/fa6";
import { FaCheckCircle } from "react-icons/fa";
import { truncate } from "../../../utils/StringUtils";
import PageTitle from "../../../layouts/PageTitle";

interface ICourse {
    id: string;
    code: string;
    title: string;
    description: string;
    visible: boolean;
    coverImage?: string;
    lessons: ILesson[];
    userProgress: {
        updatedAt: string;
        completed: boolean;
    };
}

const CoursePage = () => {
    const { courseCode } = useParams();
    const { sendJsonRequest } = useApi();

    const [course, setCourse] = useState<ICourse | null>(null);
    const [loading, setLoading] = useState(true);
    const [pageTitle, setPageTitle] = useState("Webler Codes");

    PageTitle(pageTitle);

    useEffect(() => {
        getCourse();
    }, [courseCode]);

    const getCourse = async () => {
        setLoading(true);
        const result = await sendJsonRequest(`/Courses/GetCourse`, "POST", {
            courseCode,
            includeLessons: true
        });

        if (result && result.course) {
            setCourse(result.course);
            setPageTitle("Courses - " + result.course.title + " | Webler Codes");
        }
        setLoading(false);
    };

    const getProgressPercentage = () => {
        if (!course || !course.lessons.length) return 0;
        const completedCount = course.lessons.filter(x => x.completed).length;
        return Math.round((completedCount / course.lessons.length) * 100);
    };

    const getLastUnlockedLesson = () => {
        let lastUnlockedLesson = null;
        if (course) {
            const unlockedLessons = course.lessons
                .filter(lesson => lesson.unlocked)
                .sort((a, b) => b.index - a.index);
            if (unlockedLessons.length) {
                lastUnlockedLesson = unlockedLessons[0];
            }
        }
        return lastUnlockedLesson;
    }

    let lastUnlockedLesson = getLastUnlockedLesson();

    return (
        <Container>
            <div className="wb-courses-main pt-2">
                {loading ? (
                    <p>Loading...</p>
                ) : course ? (
                    <>
                        <div className="d-flex gap-2 py-2">
                            <Link to="/Courses">Courses</Link>
                            <span>&rsaquo;</span>
                            <span>{truncate(course.title, 20)}</span>
                        </div>

                        <h3>{course.title}</h3>

                        <p className="wb-courses-course__description">{course.description}</p>

                        {lastUnlockedLesson && (
                            <Card className="mt-4 shadow-sm">
                                <Card.Body>
                                    <Card.Title>Continue your progress</Card.Title>
                                    <Card.Text>
                                        You can continue with lesson <strong>{lastUnlockedLesson.title}</strong>.
                                    </Card.Text>
                                    <Link to={`/Courses/${course.code}/Lesson/${lastUnlockedLesson.id}`}>
                                        <Button variant="primary">Go to Lesson</Button>
                                    </Link>
                                </Card.Body>
                            </Card>
                        )}

                        <div className="mt-4">
                            <h5>Progress</h5>
                            <div className="d-flex align-items-center">
                                <ProgressBar now={getProgressPercentage()} className="flex-grow-1 me-2" />
                                <span>
                                    {course.lessons.filter(l => l.completed).length} / {course.lessons.length}
                                </span>
                            </div>

                        </div>

                        <div>
                            <h5>Lessons</h5>
                            <Row>
                                {course.lessons.map(lesson => {
                                    const isInProgress = lesson.unlocked && !lesson.completed;

                                    return (
                                        <Col md={6} lg={4} key={lesson.id} className="mb-3">
                                            <Card
                                                className={`h-100 shadow-sm ${lesson.unlocked ? '' : 'bg-light text-muted'}`}
                                                style={{ cursor: lesson.unlocked ? 'pointer' : 'not-allowed' }}
                                            >
                                                <Card.Body>
                                                    <Card.Title>{lesson.title}</Card.Title>
                                                    <Card.Text>Slides: {lesson.nodeCount}</Card.Text>

                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        {lesson.unlocked && lesson.completed && (
                                                            <Badge bg="success">
                                                                <FaCheckCircle />
                                                                Completed
                                                            </Badge>
                                                        )}

                                                        {isInProgress && (
                                                            <Badge bg="info">
                                                                <FaCirclePlay />
                                                                In Progress
                                                            </Badge>
                                                        )}

                                                        {lesson.unlocked && !lesson.completed && !isInProgress && (
                                                            <Badge bg="light" text="dark">
                                                                <FaCircle />
                                                                Available
                                                            </Badge>
                                                        )}

                                                        {!lesson.unlocked && (
                                                            <Badge bg="secondary">
                                                                <FaLock />
                                                                Locked
                                                            </Badge>
                                                        )}

                                                        <small>#{lesson.index}</small>
                                                    </div>

                                                    {lesson.unlocked && (
                                                        <Link to={`/Courses/${course.code}/Lesson/${lesson.id}`}>
                                                            <Button size="sm" variant="outline-primary">Open</Button>
                                                        </Link>
                                                    )}
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    );
                                })}
                            </Row>

                        </div>
                    </>
                ) : (
                    <p>Course not found.</p>
                )}
            </div>
        </Container>
    );
};

export default CoursePage;
