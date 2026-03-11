import {
    forwardRef,
    SubmitEvent,
    useEffect,
    useImperativeHandle,
    useMemo,
    useState,
} from "react";
import {
    Alert,
    Button,
    Form,
    FormCheck,
    FormControl,
    FormGroup,
    FormLabel,
    FormSelect,
    Modal,
} from "react-bootstrap";
import { FaPlus, FaTrash } from "react-icons/fa6";
import { useApi } from "../../../context/apiCommunication";
import MdEditorField, { MDEditorMode } from "../../../components/MdEditorField";
import { genMongooseId } from "../../../utils/StringUtils";
import CodeList, { ICodesState } from "../../codes/components/CodeList";
import HtmlEditorField from "../../../components/HtmlEditorField";
import { EditorChangeLessonNodeIndexData, EditorEditLessonNodeData, EditorGetLessonNodeData, LessonNodeAnswerDetails, LessonNodeDetails } from "../types";
import LessonNode from "./LessonNode";
import LessonNodeTypeEnum from "../../../data/LessonNodeTypeEnum";
import LessonNodeModeEnum from "../../../data/LessonNodeModeEnum";

export interface LessonNodeEditorHandle {
    saveIfDirty: () => Promise<boolean>;
}

interface LessonNodeEditorProps {
    nodeId: string;
    nodeCount: number;
    onDelete: (nodeId: string) => void;
    onChangeIndex: (nodeId: string, newIndex: number) => void;
    onExit: () => void;
}

const nodeTypes = [
    { name: "Text block", value: 1 },
    { name: "Singlechoice question", value: 2 },
    { name: "Multichoice question", value: 3 },
    { name: "Text question", value: 4 },
    { name: "Code", value: 5 }
];

const nodeModes = [
    { name: "Markdown", value: 1 },
    { name: "HTML", value: 2 }
];

const LessonNodeEditor = forwardRef<LessonNodeEditorHandle, LessonNodeEditorProps>(
    ({ nodeId, nodeCount, onDelete, onChangeIndex, onExit }, ref) => {
        const { sendJsonRequest } = useApi();
        const [node, setNode] = useState<LessonNodeDetails | null>(null);
        const [nodeText, setNodeText] = useState("");
        const [nodeType, setNodeType] = useState<LessonNodeTypeEnum>(LessonNodeTypeEnum.TEXT);
        const [nodeMode, setNodeMode] = useState<LessonNodeModeEnum>(LessonNodeModeEnum.MARKDOWN);
        const [nodeCodeId, setNodeCodeId] = useState<string | null>(null);
        const [nodeCodeName, setNodeCodeName] = useState<string | null>(null);
        const [codePickerVisible, setCodePickerVisible] = useState(false);
        const [codesState, setCodesState] = useState<ICodesState>({
            page: 1,
            searchQuery: "",
            filter: 1,
            language: null,
            ready: false,
        });
        const [questionAnswers, setQuestionsAnswers] = useState<LessonNodeAnswerDetails[]>([]);
        const [questionCorrectAnswer, setQuestionCorrectAnswer] = useState("");
        const [deleteModalVisible, setDeleteModalVisible] = useState(false);
        const [message, setMessage] = useState<[string, string]>(["", ""]);
        const [loading, setLoading] = useState(false);
        const [formVisible, setFormVisible] = useState(true);

        useEffect(() => {
            getNode();
            setMessage(["", ""]);
        }, [nodeId]);

        useEffect(() => {
            if (nodeType == LessonNodeTypeEnum.SINGLECHOICE_QUESTION) {
                setQuestionsAnswers((answers) => {
                    const newAnswers = answers.map((a) => ({ ...a }));
                    let firstChecked = false;

                    for (let i = 0; i < newAnswers.length; ++i) {
                        if (newAnswers[i].correct) {
                            if (!firstChecked) {
                                firstChecked = true;
                            } else {
                                newAnswers[i].correct = false;
                            }
                        }
                    }

                    if (!firstChecked && newAnswers.length > 0) {
                        newAnswers[0].correct = true;
                    }

                    return newAnswers;
                });
            }
        }, [nodeType]);

        const getNode = async () => {
            setLoading(true);
            const result = await sendJsonRequest<EditorGetLessonNodeData>("/CourseEditor/GetLessonNode", "POST", {
                nodeId,
            });

            if (result.data) {
                const nodeData = result.data.lessonNode;
                setNode(nodeData);
                setNodeType(nodeData.type);
                setNodeMode(nodeData.mode);
                setNodeCodeId(nodeData.codeId ?? null);
                setNodeCodeName(null); // name is unknown until the picker is used or we fetch it
                setNodeText(nodeData.text);
                setQuestionCorrectAnswer(nodeData.correctAnswer ?? "");
                setQuestionsAnswers(nodeData.answers || []);
            }

            setLoading(false);
        };

        const handleDeleteNode = async () => {
            if (!node) return;

            setLoading(true);
            const result = await sendJsonRequest("/CourseEditor/DeleteLessonNode", "DELETE", {
                nodeId: node.id,
            });

            if (result && result.success) {
                closeDeleteModal();
                onDelete(nodeId);
            }

            setLoading(false);
        };

        const hasUnsavedChanges = useMemo(() => {
            if (!node) return false;

            const nodeTextTrimmed = nodeText.trim();
            const savedText = node.text.trim();

            return (
                nodeType !== node.type ||
                nodeMode !== node.mode ||
                (nodeType === LessonNodeTypeEnum.CODE && nodeCodeId !== node.codeId) ||
                (nodeType !== LessonNodeTypeEnum.CODE && nodeTextTrimmed !== savedText) ||
                (nodeType === LessonNodeTypeEnum.TEXT_QUESTION && questionCorrectAnswer !== node.correctAnswer) ||
                ((nodeType === LessonNodeTypeEnum.MULTICHOICE_QUESTION || nodeType === LessonNodeTypeEnum.SINGLECHOICE_QUESTION) && questionAnswers.length !== node.answers.length ||
                !node.answers.every((x) => {
                    const answer = questionAnswers.find((y) => y.id === x.id);
                    return answer && answer.text === x.text && answer.correct === x.correct;
                }))
            );
        }, [node, nodeType, nodeCodeId, nodeMode, nodeText, questionCorrectAnswer, questionAnswers]);

        const validateNode = (showMessage: boolean) => {
            if (nodeType == LessonNodeTypeEnum.MULTICHOICE_QUESTION || nodeType == LessonNodeTypeEnum.SINGLECHOICE_QUESTION) {
                if (questionAnswers.length < 2) {
                    if (showMessage) setMessage(["danger", "Question cannot have less than 2 answers"]);
                    return false;
                } else if (questionAnswers.length > 4) {
                    if (showMessage) setMessage(["danger", "Question cannot have more than 4 answers"]);
                    return false;
                }
            } else if (nodeType === LessonNodeTypeEnum.TEXT_QUESTION && questionCorrectAnswer.length == 0) {
                if (showMessage) setMessage(["danger", "Correct answer cannot be empty"]);
                return false;
            }
            return true;
        };

        const saveNode = async (showMessage: boolean) => {
            if (!node) return false;

            if (!validateNode(showMessage)) return false;

            const result = await sendJsonRequest<EditorEditLessonNodeData>("/CourseEditor/EditLessonNode", "PUT", {
                nodeId: node.id,
                type: nodeType,
                mode: nodeMode,
                codeId: nodeType === LessonNodeTypeEnum.CODE ? nodeCodeId : null,
                text: nodeType !== LessonNodeTypeEnum.CODE ? nodeText : undefined,
                correctAnswer: nodeType === LessonNodeTypeEnum.TEXT_QUESTION ? questionCorrectAnswer : undefined,
                answers: (nodeType === LessonNodeTypeEnum.SINGLECHOICE_QUESTION || nodeType === LessonNodeTypeEnum.MULTICHOICE_QUESTION) ? questionAnswers : undefined
            });

            if (result.data) {
                setNode((prev) => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        ...result.data
                    };
                });

                setQuestionsAnswers(result.data.answers);

                if (showMessage) setMessage(["success", "Lessson node was saved successfully."]);
                return true;
            } else {
                if (showMessage) setMessage(["danger", result.error?.[0].message ?? "Failed to save node"]);
            }
            return false;
        };

        useImperativeHandle(ref, () => ({
            saveIfDirty: async () => {
                if (!node) return true;

                if (hasUnsavedChanges) {
                    setLoading(true);
                    const ok = await saveNode(true);
                    setLoading(false);
                    return ok;
                }

                return validateNode(true);
            },
        }));

        const handleSubmit = async (e: SubmitEvent) => {
            e.preventDefault();
            setLoading(true);
            await saveNode(true);
            setLoading(false);
            scrollTo(0, 0);
        };

        const handleExit = () => {
            onExit();
            scrollTo(0, 0);
        }

        const closeDeleteModal = () => {
            setDeleteModalVisible(false);
        };

        const handleEditAnswerText = (idx: number, text: string) => {
            setQuestionsAnswers((answers) => {
                const newAnswers = answers.map((a) => ({ ...a }));
                newAnswers[idx].text = text;
                return newAnswers;
            });
        };

        const toggleCorrectAnswer = (idx: number, value: boolean, singlechoice: boolean) => {
            setQuestionsAnswers((answers) => {
                const newAnswers = answers.map((a) => ({ ...a }));

                if (singlechoice && value) {
                    for (let i = 0; i < newAnswers.length; ++i) {
                        newAnswers[i].correct = i === idx;
                    }
                } else {
                    newAnswers[idx].correct = value;
                }

                return newAnswers;
            });
        };

        const handleRemoveAnswer = (idx: number) => {
            setQuestionsAnswers((answers) => answers.filter((_, i) => idx != i));
        };

        const handleAddAnswer = (singlechoice: boolean) => {
            setQuestionsAnswers((answers) => [
                ...answers,
                { id: genMongooseId(), text: "", correct: answers.length == 0 && singlechoice },
            ]);
        };

        const handleChangeIndex = async (newIndex: number) => {
            if (!node) return;

            setLoading(true);
            const ok = hasUnsavedChanges ? await saveNode(true) : validateNode(true);

            if (ok) {
                const result = await sendJsonRequest<EditorChangeLessonNodeIndexData>("/CourseEditor/ChangeLessonNodeIndex", "POST", {
                    nodeId: node.id,
                    newIndex,
                });

                if (result.data) {
                    setNode((prev) => {
                        if (!prev) return null;
                        return { ...prev, ...result.data };
                    });

                    onChangeIndex(node.id, newIndex);
                    setMessage(["success", "Node index changed successfully."]);
                } else {
                    setMessage(["danger", result.error?.[0]?.message ?? "Failed to change index"]);
                }
            }

            setLoading(false);
        };

        const onEditorModeChange = (mode: MDEditorMode) => {
            setFormVisible(mode == "write");
        };

        const previewNodeData = useMemo(() => {
            if (!node) return null;
            return {
                ...node,
                type: nodeType,
                mode: nodeMode,
                codeId: nodeCodeId,
                text: nodeText,
                correctAnswer: questionCorrectAnswer,
                answers: questionAnswers,
            };
        }, [node, nodeType, nodeMode, nodeText, nodeCodeId, questionCorrectAnswer, questionAnswers]);

        const customPreview = useMemo(() => {
            if (!previewNodeData) return undefined;

            return (
                <div className="d-flex flex-column" style={{ minHeight: "368px" }}>
                    <div className="flex-grow-1 border border-2 rounded">
                        <LessonNode
                            nodeData={previewNodeData}
                            mock={true}
                        />
                    </div>
                </div>
            );
        }, [previewNodeData]);

        const getEditorFields = () => {
            switch (nodeType) {
                case 2:
                    return (
                        <FormGroup>
                            <FormLabel>Answers</FormLabel>
                            {questionAnswers.map((answer, i) => (
                                <div className="d-flex gap-3 align-items-center mb-2" key={answer.id ?? i}>
                                    <FormControl
                                        value={answer.text}
                                        onChange={(e) => handleEditAnswerText(i, e.target.value)}
                                        placeholder={`Answer ${i + 1}`}
                                        required
                                    />
                                    <FormCheck
                                        name="answer-correct"
                                        type="radio"
                                        label="Correct"
                                        id={"answer-correct-input-" + i}
                                        checked={answer.correct}
                                        onChange={(e) => toggleCorrectAnswer(i, e.target.checked, true)}
                                    />
                                    <span className="wb-comments__options__item" onClick={() => handleRemoveAnswer(i)}>
                                        <FaTrash />
                                    </span>
                                </div>
                            ))}
                            <div>
                                <Button
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => handleAddAnswer(true)}
                                    disabled={questionAnswers.length >= 4}
                                    type="button"
                                >
                                    <FaPlus className="me-1" /> Add answer
                                </Button>
                            </div>
                        </FormGroup>
                    );

                case 3:
                    return (
                        <FormGroup>
                            <FormLabel>Answers</FormLabel>
                            {questionAnswers.map((answer, i) => (
                                <div className="d-flex gap-3 align-items-center mb-2" key={answer.id ?? i}>
                                    <FormControl
                                        value={answer.text}
                                        onChange={(e) => handleEditAnswerText(i, e.target.value)}
                                        placeholder={`Answer ${i + 1}`}
                                        required
                                        maxLength={120}
                                    />
                                    <FormCheck
                                        name="answer-correct"
                                        type="checkbox"
                                        label="Correct"
                                        id={"answer-correct-input-" + i}
                                        checked={answer.correct}
                                        onChange={(e) => toggleCorrectAnswer(i, e.target.checked, false)}
                                    />
                                    <span className="wb-comments__options__item" onClick={() => handleRemoveAnswer(i)}>
                                        <FaTrash />
                                    </span>
                                </div>
                            ))}
                            <div>
                                <Button
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => handleAddAnswer(false)}
                                    disabled={questionAnswers.length >= 4}
                                    type="button"
                                >
                                    <FaPlus className="me-1" /> Add answer
                                </Button>
                            </div>
                        </FormGroup>
                    );

                case 4:
                    return (
                        <FormGroup>
                            <FormLabel>Correct answer</FormLabel>
                            <FormControl
                                value={questionCorrectAnswer}
                                onChange={(e) => setQuestionCorrectAnswer(e.target.value)}
                                required
                                maxLength={60}
                            />
                        </FormGroup>
                    );

                default:
                    return <></>;
            }
        };

        return (
            node !== null && (
                <>
                    <Modal show={deleteModalVisible} onHide={closeDeleteModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title>Are you sure?</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>Lesson node will be permanently deleted.</Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={closeDeleteModal} type="button">
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={handleDeleteNode} type="button">
                                Delete
                            </Button>
                        </Modal.Footer>
                    </Modal>

                    {message[1] && (
                        <Alert variant={message[0]} onClose={() => setMessage(["", ""])} dismissible>
                            {message[1]}
                        </Alert>
                    )}

                    <div className="mt-2">
                        <Form onSubmit={handleSubmit}>
                            <FormGroup>
                                <FormLabel>Type</FormLabel>
                                <FormSelect
                                    value={nodeType}
                                    onChange={(e) => setNodeType(Number(e.target.value))}
                                    required
                                >
                                    {nodeTypes.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.name}
                                        </option>
                                    ))}
                                </FormSelect>
                            </FormGroup>

                            {
                                nodeType !== 5 &&
                                <FormGroup>
                                    <FormLabel>Mode</FormLabel>
                                    <FormSelect
                                        value={nodeMode}
                                        onChange={(e) => setNodeMode(Number(e.target.value))}
                                        required
                                    >
                                        {nodeModes.map((mode) => (
                                            <option key={mode.value} value={mode.value}>
                                                {mode.name}
                                            </option>
                                        ))}
                                    </FormSelect>
                                </FormGroup>
                            }

                            {nodeType !== LessonNodeTypeEnum.CODE ? (
                                <FormGroup>
                                    <FormLabel>Text</FormLabel>
                                    {
                                        nodeMode === LessonNodeModeEnum.MARKDOWN ?
                                            <MdEditorField
                                                section="CourseEditor"
                                                rootAlias="lesson-images"
                                                text={nodeText}
                                                setText={setNodeText}
                                                maxCharacters={8000}
                                                row={10}
                                                placeHolder={"Enter Description"}
                                                onModeChange={onEditorModeChange}
                                                customPreview={customPreview}
                                                isPost={false}
                                            />
                                            :
                                            <HtmlEditorField
                                                section="CourseEditor"
                                                rootAlias="lesson-images"
                                                text={nodeText}
                                                setText={setNodeText}
                                                maxCharacters={8000}
                                                rows={20}
                                                onModeChange={onEditorModeChange}
                                                customPreview={customPreview}
                                            />
                                    }
                                </FormGroup>
                            ) : (
                                <FormGroup className="mt-3">
                                    <FormLabel>Selected Code Snippet</FormLabel>
                                    <div className="d-flex gap-2 align-items-center">
                                        <FormControl
                                            value={nodeCodeName ?? nodeCodeId ?? "No snippet selected"}
                                            disabled
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setCodePickerVisible(true);
                                                setCodesState((prev) => ({ ...prev, ready: true }));
                                            }}
                                            type="button"
                                        >
                                            Pick
                                        </Button>
                                    </div>
                                    <div className="mt-3">
                                        <FormLabel>Preview</FormLabel>
                                        {customPreview}
                                    </div>
                                </FormGroup>
                            )}

                            {formVisible && getEditorFields()}

                            <Modal
                                show={codePickerVisible}
                                onHide={() => setCodePickerVisible(false)}
                                centered
                                size="lg"
                            >
                                <Modal.Header closeButton>
                                    <Modal.Title>Pick a Code Snippet</Modal.Title>
                                </Modal.Header>
                                <Modal.Body style={{ minHeight: "500px" }}>
                                    <CodeList
                                        codesState={codesState}
                                        setCodesState={setCodesState}
                                        onCodeClick={async (code) => {
                                            setNodeCodeId(code.id);
                                            setNodeCodeName(code.name);
                                            setCodePickerVisible(false);
                                        }}
                                        isCodeSelected={(id) => nodeCodeId === id}
                                        showNewCodeBtn={false}
                                    />
                                </Modal.Body>
                            </Modal>

                            <div className="d-sm-flex justify-content-between mt-4">
                                <div className="d-flex gap-2 justify-content-end">
                                    <Button
                                        size="sm"
                                        disabled={loading || node.index <= 1}
                                        onClick={() => void handleChangeIndex(node.index - 1)}
                                        type="button"
                                    >
                                        Move left
                                    </Button>
                                    <Button
                                        size="sm"
                                        disabled={loading || node.index >= nodeCount}
                                        onClick={() => void handleChangeIndex(node.index + 1)}
                                        type="button"
                                    >
                                        Move right
                                    </Button>
                                </div>

                                <div className="d-flex gap-2 justify-content-end mt-2 mt-sm-0">
                                    <Button
                                        size="sm"
                                        disabled={loading}
                                        variant="secondary"
                                        type="button"
                                        onClick={handleExit}
                                    >
                                        Exit
                                    </Button>
                                    <Button
                                        size="sm"
                                        disabled={loading}
                                        variant="secondary"
                                        type="button"
                                        onClick={() => setDeleteModalVisible(true)}
                                    >
                                        Delete
                                    </Button>
                                    <Button size="sm" disabled={loading} type="submit">
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    </div>
                </>
            )
        );
    }
);

LessonNodeEditor.displayName = "LessonNodeEditor";
export default LessonNodeEditor;