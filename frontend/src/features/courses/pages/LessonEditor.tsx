import { Button, ButtonGroup, ToggleButton } from "react-bootstrap";
import { ILesson } from "../components/Lesson"
import { FaPlus } from "react-icons/fa6";
import { useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import LessonNodeEditor from "./LessonNodeEditor";
import { useSearchParams } from "react-router-dom";
import LessonNode from "../components/LessonNode";

interface LessonEditorProps {
    lessonId: string;
}

const LessonEditor = ({ lessonId }: LessonEditorProps) => {
    const { sendJsonRequest } = useApi();
    const [lesson, setLesson] = useState<ILesson | null>(null);
    const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [nodePreviewVisible, setNodePreviewVisible] = useState(false);

    useEffect(() => {
        getLesson();
    }, [lessonId]);

    useEffect(() => {
        if (lesson) {
            if (searchParams.has("slide")) {
                const node = lesson.nodes.find((x: any) => x.index == Number(searchParams.get("slide")));
                if (node) {
                    setCurrentNodeId(node.id);
                }
            }
        }
    }, [lesson]);

    const getLesson = async () => {
        const result = await sendJsonRequest("/CourseEditor/GetLesson", "POST", {
            lessonId
        });
        if (result && result.lesson) {
            setLesson(result.lesson);
        }
    }

    const createLessonNode = async () => {
        const result = await sendJsonRequest("/CourseEditor/CreateLessonNode", "POST", {
            lessonId: lessonId
        });
        if (result && result.lessonNode) {
            setLesson(current => {
                if (!current) return null;
                return {
                    ...current,
                    nodeCount: current.nodeCount + 1,
                    nodes: [...current.nodes, { id: result.lessonNode.id, index: result.lessonNode.index, type: result.lessonNode.type, unlocked: true }]

                }
            });
            setCurrentNodeId(result.lessonNode.id);
        }
    }

    const onLessonNodeDelete = (nodeId: string) => {
        setCurrentNodeId(null);
        setLesson(current => {
            if (!current) return null;
            let newNodes = [];
            let deletedFound = false;
            for (let i = 0; i < current.nodes.length; ++i) {
                const node = current.nodes[i];
                if (node.id === nodeId) {
                    deletedFound = true;
                    continue;
                }
                if (deletedFound) {
                    --node.index;
                }
                newNodes.push(node);
            }
            return {
                ...current,
                nodeCount: newNodes.length,
                nodes: newNodes

            }
        });
    }

    const onLessonNodeChangeIndex = (nodeId: string, newIndex: number) => {
        setLesson(current => {
            if (!current) return null;
            let newNodes = [...current.nodes];
            const node = newNodes.find(x => x.id == nodeId);
            if (node) {
                const oldIndex = node.index;

                newNodes[newIndex - 1].index = oldIndex;
                newNodes[oldIndex - 1].index = newIndex;

                newNodes[oldIndex - 1] = newNodes[newIndex - 1];
                newNodes[newIndex - 1] = node;
            }
            return {
                ...current,
                nodes: newNodes

            }
        });
    }

    const handleNodeChange = (nodeId: string) => {
        if (!lesson) {
            return;
        }
        setNodePreviewVisible(false);
        setCurrentNodeId(nodeId);
        const node = lesson.nodes.find(x => x.id == nodeId);
        if (node) {
            searchParams.set("slide", node.index.toString());
            setSearchParams(searchParams, { replace: true });
        }
    }

    const onNodePreview = () => {
        setNodePreviewVisible(true);
    }

    const handleExitPreview = () => {
        setNodePreviewVisible(false);
    }

    return (
        lesson !== null &&
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
                            onChange={(e) => handleNodeChange(e.currentTarget.value)}
                            size="sm"
                        >
                            {node.index}
                        </ToggleButton>
                    ))}
                </ButtonGroup>
                <Button size="sm" onClick={createLessonNode}>
                    <FaPlus />
                </Button>
            </div>
            {
                currentNodeId !== null &&
                (nodePreviewVisible ?
                    <div className="d-flex flex-column" style={{ minHeight: "368px" }}>
                        <div className="flex-grow-1 border border-2">
                            <LessonNode nodeId={currentNodeId} mock={true} onAnswered={() => { }} onContinue={() => { }} onEnter={() => { }} />
                        </div>
                        <div className="d-flex justify-content-end mt-2">
                            <Button variant="secondary" size="sm" onClick={handleExitPreview}>Exit Preview</Button>
                        </div>
                    </div>
                    :
                    <LessonNodeEditor nodeId={currentNodeId} nodeCount={lesson.nodeCount} onChangeIndex={onLessonNodeChangeIndex} onDelete={onLessonNodeDelete} onPreview={onNodePreview} />
                )
            }
        </div>
    );
}

export default LessonEditor;