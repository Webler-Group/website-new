import { Button, ButtonGroup, ToggleButton } from "react-bootstrap";
import { ILesson } from "./Lesson";
import { FaPlus } from "react-icons/fa6";
import { useEffect, useRef, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import LessonNodeEditor, { LessonNodeEditorHandle } from "./LessonNodeEditor";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Loader from "../../../components/Loader";

interface LessonEditorProps {
    lessonId: string;
}

const LessonEditor = ({ lessonId }: LessonEditorProps) => {
    const { sendJsonRequest } = useApi();
    const [lesson, setLesson] = useState<ILesson | null>(null);
    const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [switchingNode, setSwitchingNode] = useState(false);
    const { courseId } = useParams();
    const navigate = useNavigate();

    const nodeEditorRef = useRef<LessonNodeEditorHandle | null>(null);

    useEffect(() => {
        getLesson();
    }, [lessonId]);

    useEffect(() => {
        if (!lesson) return;

        if (searchParams.has("slide")) {
            const idx = Number(searchParams.get("slide"));
            const node = lesson.nodes.find((x: any) => x.index == idx);
            if (node) {
                setCurrentNodeId(node.id);
            }
        } else {
            if (lesson.nodes.length > 0) {
                setCurrentNodeId(lesson.nodes[0].id);
                searchParams.set("slide", lesson.nodes[0].index.toString());
                setSearchParams(searchParams, { replace: true });
            }
        }
    }, [lesson?.id]);

    const getLesson = async () => {
        setLoading(true);
        const result = await sendJsonRequest("/CourseEditor/GetLesson", "POST", {
            lessonId,
        });
        if (result && result.lesson) {
            setLesson(result.lesson);
        }
        setLoading(false);
    };

    const ensureCurrentNodeSaved = async (): Promise<boolean> => {
        if (!nodeEditorRef.current) return true;
        return await nodeEditorRef.current.saveIfDirty();
    };

    const createLessonNode = async () => {
        if (switchingNode) return;
        setSwitchingNode(true);

        const ok = await ensureCurrentNodeSaved();
        if (!ok) {
            setSwitchingNode(false);
            return;
        }

        const result = await sendJsonRequest("/CourseEditor/CreateLessonNode", "POST", {
            lessonId: lessonId,
        });

        if (result && result.lessonNode) {
            setLesson((current) => {
                if (!current) return null;
                const newNodes = [
                    ...current.nodes,
                    {
                        id: result.lessonNode.id,
                        index: result.lessonNode.index,
                        type: result.lessonNode.type,
                        unlocked: true,
                    },
                ];
                return {
                    ...current,
                    nodeCount: newNodes.length,
                    nodes: newNodes,
                };
            });

            setCurrentNodeId(result.lessonNode.id);

            searchParams.set("slide", result.lessonNode.index.toString());
            setSearchParams(searchParams, { replace: true });
        }

        setSwitchingNode(false);
    };

    const onLessonNodeDelete = (nodeId: string) => {
        setCurrentNodeId(null);
        setLesson((current) => {
            if (!current) return null;
            const newNodes: any[] = [];
            let deletedFound = false;

            for (let i = 0; i < current.nodes.length; ++i) {
                const node = { ...current.nodes[i] };
                if (node.id === nodeId) {
                    deletedFound = true;
                    continue;
                }
                if (deletedFound) {
                    node.index = node.index - 1;
                }
                newNodes.push(node);
            }

            return {
                ...current,
                nodeCount: newNodes.length,
                nodes: newNodes,
            };
        });
    };

    const onLessonNodeChangeIndex = (nodeId: string, newIndex: number) => {
        setLesson((current) => {
            if (!current) return null;

            const newNodes = current.nodes.map((n: any) => ({ ...n }));
            const node = newNodes.find((x) => x.id == nodeId);
            if (node) {
                const oldIndex = node.index;

                newNodes[newIndex - 1].index = oldIndex;
                newNodes[oldIndex - 1].index = newIndex;

                const tmp = newNodes[oldIndex - 1];
                newNodes[oldIndex - 1] = newNodes[newIndex - 1];
                newNodes[newIndex - 1] = tmp;

                searchParams.set("slide", newIndex.toString());
                setSearchParams(searchParams, { replace: true });
            }

            return {
                ...current,
                nodes: newNodes,
            };
        });
    };

    const onLessonNodeExit = () => {
        setCurrentNodeId(null);
    }

    const handleNodeChange = async (nodeId: string) => {
        if (!lesson) return;
        if (switchingNode) return;
        if (nodeId === currentNodeId) return;

        setSwitchingNode(true);

        const ok = await ensureCurrentNodeSaved();
        if (!ok) {
            setSwitchingNode(false);
            return;
        }

        setCurrentNodeId(nodeId);
        const node = lesson.nodes.find((x) => x.id == nodeId);
        if (node) {
            searchParams.set("slide", node.index.toString());
            setSearchParams(searchParams, { replace: true });
        }

        setSwitchingNode(false);
    };

    return lesson !== null ? (
        <>
            <div className="p-2">
                <h4>{lesson.title}</h4>
                <div className="d-flex justify-content-between my-3">
                    <ButtonGroup size="sm">
                        {lesson.nodes.map((node, i) => (
                            <ToggleButton
                                key={i}
                                id={`current-lesson-input-${node.index}`}
                                type="radio"
                                variant="outline-primary"
                                name="current-lesson"
                                value={node.id}
                                checked={currentNodeId === node.id}
                                onChange={(e) => void handleNodeChange(e.currentTarget.value)}
                                size="sm"
                                disabled={switchingNode}
                            >
                                {node.index}
                            </ToggleButton>
                        ))}
                    </ButtonGroup>

                    <Button size="sm" onClick={() => void createLessonNode()} disabled={switchingNode}>
                        <FaPlus />
                    </Button>
                </div>

                {currentNodeId !== null && (
                    <LessonNodeEditor
                        ref={nodeEditorRef}
                        nodeId={currentNodeId}
                        nodeCount={lesson.nodeCount}
                        onChangeIndex={onLessonNodeChangeIndex}
                        onDelete={onLessonNodeDelete}
                        onExit={onLessonNodeExit}
                    />
                )}
            </div>
        </>
    ) : (
        <div className="my-5 text-center">
            {loading ? (
                <Loader />
            ) : (
                <div>
                    <p className="mb-2">Lesson could not be loaded</p>
                    <Button size="sm" onClick={() => navigate("/Courses/Editor/" + courseId)}>
                        Back to course
                    </Button>
                </div>
            )}
        </div>
    );
};

export default LessonEditor;
