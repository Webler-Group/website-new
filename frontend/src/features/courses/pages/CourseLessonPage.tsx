import { useEffect, useState } from "react";
import { Button, Nav } from "react-bootstrap";
import { FaQuestionCircle, FaTimes } from "react-icons/fa";
import { FaBookOpen } from "react-icons/fa6";
import { ILesson } from "../components/Lesson";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import LessonNode from "../components/LessonNode";

const CourseLessonPage = () => {
    const { lessonId, courseCode } = useParams();
    const [lesson, setLesson] = useState<ILesson | null>(null);
    const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        getLesson();
    }, [lessonId]);

    useEffect(() => {
        if (searchParams.has("slide")) {
            setCurrentNodeIndex(Number(searchParams.get("slide")));
        }
    }, [searchParams]);

    useEffect(() => {
        if (lesson) {
            if (!searchParams.has("slide")) {
                const unlockedNodes = lesson.nodes.filter(x => x.unlocked).sort((a, b) => b.index - a.index);
                if (unlockedNodes.length) {
                    searchParams.set("slide", unlockedNodes[0].index.toString());
                    setSearchParams(searchParams, { replace: true });
                }
            }
        }
    }, [lesson]);

    const getLesson = async () => {
        const result = await sendJsonRequest(`/Courses/GetLesson`, "POST", {
            lessonId
        });
        if (result && result.lesson) {
            setLesson(result.lesson);
        }
    }

    const handleSelectNode = (index: number, unlocked: boolean) => {
        if (!lesson) {
            return;
        }
        if (unlocked) {
            searchParams.set("slide", index.toString());
            setSearchParams(searchParams, { replace: true });
        }
    };

    const onNodeContinue = (id: string) => {
        if (!lesson) {
            return;
        }
        const node = lesson.nodes.find(x => x.id == id);
        if (node) {
            if (node.index < lesson.nodeCount) {
                searchParams.set("slide", (node.index + 1).toString());
                setSearchParams(searchParams, { replace: true });
            } else {
                handleExit();
            }
        }
    }

    const onNodeEnter = (id: string) => {
        if (!lesson) {
            return;
        }
        const node = lesson.nodes.find(x => x.id == id);
        if (node && node.type == 1) {
            setLesson(current => {
                if (!current) return null;
                const nodes = current.nodes;
                for (let i = 0; i < nodes.length; ++i) {
                    if (nodes[i].index == node.index + 1) {
                        nodes[i].unlocked = true;
                    }
                }
                return {
                    ...current,
                    nodes
                };
            });
        }
    }

    const onNodeAnswered = (id: string, correct: boolean) => {
        if (!lesson) {
            return;
        }
        const node = lesson.nodes.find(x => x.id == id);
        if (node && correct) {
            setLesson(current => {
                if (!current) return null;
                const nodes = current.nodes;
                for (let i = 0; i < nodes.length; ++i) {
                    if (nodes[i].index == node.index + 1) {
                        nodes[i].unlocked = true;
                    }
                }
                return {
                    ...current,
                    nodes
                };
            });
        }
    }

    const handleExit = () => {
        navigate("/Courses/" + courseCode);
    }

    return (

        <div className="wb-course-lesson-container d-flex flex-column">
            {lesson && (
                <>
                    <div className="d-flex p-2">
                        <div className="d-flex align-items-center">
                            <Button variant="link" className="text-secondary" onClick={handleExit}>
                                <FaTimes />
                            </Button>
                            <span className="text-secondary" style={{ fontSize: "24px", fontWeight: "bold" }} >{lesson.title}</span>
                        </div>
                    </div>

                    <div className="wb-course-lesson-main">
                        <Nav variant="pills" className="flex-row overflow-auto my-3 row-gap-1">
                            {lesson.nodes.map((node) => {
                                const isActive = node.index === currentNodeIndex;
                                const icon = node.type === 1 ? <FaBookOpen /> : <FaQuestionCircle />;

                                return (
                                    <Nav.Item key={node.id}>
                                        <Nav.Link
                                            className={"wb-course-lesson-arrow-pill " + (node.unlocked ? isActive ? "bg-warning text-dark" : "bg-primary text-light" : "bg-secondary text-light")}
                                            onClick={() => handleSelectNode(node.index, node.unlocked)}
                                            disabled={!node.unlocked}
                                        >
                                            {icon}
                                        </Nav.Link>
                                    </Nav.Item>
                                );
                            })}
                        </Nav>
                    </div>

                    <div className="flex-grow-1 mt-2">
                        {
                            currentNodeIndex != 0 &&
                            <LessonNode nodeId={lesson.nodes.find(x => x.index == currentNodeIndex)?.id!} mock={false} onContinue={onNodeContinue} onAnswered={onNodeAnswered} onEnter={onNodeEnter} />
                        }
                    </div>
                </>
            )}
        </div>

    );
};

export default CourseLessonPage;
