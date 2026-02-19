import { useEffect, useState } from "react";
import { Button, Nav, Offcanvas } from "react-bootstrap";
import { FaQuestionCircle, FaTimes, FaCode } from "react-icons/fa";
import { FaBookOpen, FaComments } from "react-icons/fa6";
import { ILesson } from "../components/Lesson";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import LessonNode from "../components/LessonNode";
import CommentList from "../../../components/comments/CommentList";

const CourseLessonPage = () => {
    const { lessonId, courseCode } = useParams();
    const [lesson, setLesson] = useState<ILesson | null>(null);
    const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [commentModalVisible, setCommentModalVisible] = useState(false);
    const [commentListOptions, setCommentListOptions] = useState({ section: "Courses", params: { lessonId } });
    const [commentCount, setCommentCount] = useState(0);
    const [findPost, setFindPost] = useState<any | null>(null);

    useEffect(() => {
        if (lessonId) {
            getLesson();
            setCommentListOptions({ section: "Courses", params: { lessonId } });
        }
    }, [lessonId]);

    useEffect(() => {
        if (searchParams.has("slide")) {
            setCurrentNodeIndex(Number(searchParams.get("slide")));
        }
    }, [searchParams]);

    useEffect(() => {
        if (location.state && location.state.postId) {
            openCommentModal();
            setFindPost({ id: location.state.postId, isReply: location.state.isReply });

        }
    }, [location]);

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
            setCommentCount(result.lesson.comments);
        }
    }

    const handleSelectNode = (index: number, unlocked: boolean) => {
        if (!lesson) {
            return;
        }
        if (unlocked) {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set("slide", index.toString());
            setSearchParams(newSearchParams, { replace: true });
        }
    };

    const onNodeContinue = (id: string) => {
        if (!lesson) {
            return;
        }
        const node = lesson.nodes.find(x => x.id == id);
        if (node) {
            if (node.index < lesson.nodeCount) {
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set("slide", (node.index + 1).toString());
                setSearchParams(newSearchParams, { replace: true });
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
        if (node && (node.type === 1 || node.type === 5)) {
            setLesson(current => {
                if (!current) return null;
                const nodes = current.nodes.map(n => {
                    if (n.index === node.index + 1) {
                        return { ...n, unlocked: true };
                    }
                    return n;
                });
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
                const nodes = current.nodes.map(n => {
                    if (n.index === node.index + 1) {
                        return { ...n, unlocked: true };
                    }
                    return n;
                });
                return {
                    ...current,
                    nodes
                };
            });
        }
    }


    const openCommentModal = () => {
        if (!lessonId) return;
        setCommentModalVisible(true)
    }

    const closeCommentModal = () => {
        setCommentModalVisible(false);
    }

    const handleExit = () => {
        navigate("/Courses/" + courseCode);
    }

    return (

        <div className="wb-courses-lesson-container d-flex flex-column">
            {lesson && (
                <>
                    <Offcanvas show={commentModalVisible} onHide={closeCommentModal} placement="end">
                        <Offcanvas.Header closeButton>
                            <Offcanvas.Title>{commentCount} Comments</Offcanvas.Title>
                        </Offcanvas.Header>
                        <Offcanvas.Body className="d-flex flex-column" style={{ height: "calc(100% - 62px)" }}>
                            <CommentList
                                findPost={findPost}
                                options={commentListOptions}
                                setCommentCount={setCommentCount}
                            />
                        </Offcanvas.Body>
                    </Offcanvas>
                    <div className="d-flex justify-content-between py-1 px-3 border-bottom align-items-center">
                        <div className="d-flex align-items-center">
                            <Button variant="link" className="text-secondary p-1" onClick={handleExit}>
                                <FaTimes size={18} />
                            </Button>
                            <span className="text-secondary ms-2" style={{ fontSize: "18px", fontWeight: "bold" }} >{lesson.title}</span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <span className="small text-secondary">{commentCount}</span>
                            <Button variant="link" className="text-secondary p-1" onClick={openCommentModal}>
                                <FaComments size={18} />
                            </Button>
                        </div>
                    </div>

                    <div className="wb-courses-lesson-main">
                        <Nav variant="pills" className="flex-nowrap overflow-auto my-2">
                            {lesson.nodes.map((node) => {
                                const isActive = node.index === currentNodeIndex;
                                const icon = node.type === 5 ? <FaCode /> : node.type === 1 ? <FaBookOpen /> : <FaQuestionCircle />;

                                return (
                                    <Nav.Item key={node.id}>
                                        <Nav.Link
                                            className={"wb-courses-lesson-arrow-pill " + (isActive ? "bg-warning text-dark" : node.unlocked ? "bg-primary text-light" : "bg-secondary text-light")}
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
