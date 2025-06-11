import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Form, FormCheck, FormControl, FormGroup, FormLabel, FormSelect, Modal } from "react-bootstrap";
import { FaPlus, FaTrash } from "react-icons/fa6";
import { useApi } from "../../../context/apiCommunication";

interface ILessonNodeAnswer {
    id?: string;
    text: string;
    correct: boolean;
}

interface ILessonNode {
    id: string;
    type: number;
    index: number;
    text?: string;
    answers: ILessonNodeAnswer[];
    correctAnswer?: string;
}

interface LessonNodeEditorProps {
    nodeId: string;
    nodeCount: number;
    onDelete: (nodeId: string) => void;
    onChangeIndex: (nodeId: string, newIndex: number) => void;
}

const LessonNodeEditor = ({ nodeId, nodeCount, onDelete, onChangeIndex }: LessonNodeEditorProps) => {
    const { sendJsonRequest } = useApi();
    const [node, setNode] = useState<ILessonNode | null>(null);
    const [nodeText, setNodeText] = useState("");
    const [nodeType, setNodeType] = useState(0);
    const [questionAnswers, setQuestionsAnswers] = useState<ILessonNodeAnswer[]>([]);
    const [questionCorrectAnswer, setQuestionCorrectAnswer] = useState("");
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [message, setMessage] = useState(["", ""]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getNode();
        setMessage(["", ""]);
    }, [nodeId]);

    useEffect(() => {
        if (nodeType == 2) {
            setQuestionsAnswers(answers => {
                const newAnswers = [...answers];
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
        const result = await sendJsonRequest("/CourseEditor/GetLessonNode", "POST", {
            nodeId
        });
        if (result && result.lessonNode) {
            setNode(result.lessonNode);
            setNodeType(result.lessonNode.type);
            setNodeText(result.lessonNode.text ?? "");
            setQuestionCorrectAnswer(result.lessonNode.correctAnswer ?? "");
            setQuestionsAnswers(result.lessonNode.answers);
        }
        setLoading(false);
    }

    const handleDeleteNode = async () => {
        if (!node) {
            return;
        }
        setLoading(true);
        const result = await sendJsonRequest("/CourseEditor/DeleteLessonNode", "DELETE", {
            nodeId: node.id
        });
        if (result && result.success) {
            closeDeleteModal();
            onDelete(nodeId);
        }
        setLoading(false);
    }

    const handleSaveNode = async (e: FormEvent) => {
        e.preventDefault();

        if (!node) {
            return;
        }

        setLoading(true);
        if ((nodeType == 2 || nodeType == 3)) {
            if (questionAnswers.length < 2) {
                setMessage(["danger", "Question cannot have less than 2 answers"]);
                return;
            } else if (questionAnswers.length > 4) {
                setMessage(["danger", "Question cannot have more than 4 answers"]);
                return;
            }
        }

        const result = await sendJsonRequest("/CourseEditor/EditLessonNode", "PUT", {
            nodeId: node.id,
            type: nodeType,
            text: nodeText,
            correctAnswer: questionCorrectAnswer,
            answers: questionAnswers
        });
        if (result && result.success) {
            setNode(node => {
                if (!node) return null;
                return {
                    ...node,
                    type: result.data.type,
                    text: result.data.text,
                    correctAnswer: result.data.correctAnswer,
                    answers: result.data.answers
                }
            });
            setQuestionsAnswers(result.data.answers);
            setMessage(["success", "Lessson node was saved successfully."])
        }
        setLoading(false);
    }

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
    }

    const handleEditAnswerText = (idx: number, text: string) => {
        setQuestionsAnswers(answers => {
            const newAnswers = [...answers];
            newAnswers[idx].text = text;
            return newAnswers;
        });
    }

    const toggleCorrectAnswer = (idx: number, value: boolean, singlechoice: boolean) => {
        setQuestionsAnswers(answers => {
            const newAnswers = [...answers];
            if (singlechoice && value) {
                for (let i = 0; i < newAnswers.length; ++i) {
                    answers[i].correct = i == idx;
                }
            } else {
                newAnswers[idx].correct = value;
            }
            return newAnswers;
        });
    }

    const handleRemoveAnswer = (idx: number) => {
        setQuestionsAnswers(answers => {
            return answers.filter((_, i) => idx != i);
        });
    }

    const handleAddAnswer = (singlechoice: boolean) => {
        setQuestionsAnswers(answers => {
            return [...answers, { text: "", correct: answers.length == 0 && singlechoice }];
        })
    }

    const handleChangeIndex = async (newIndex: number) => {
        if(!node) {
            return;
        }

        setLoading(true);
        const result = await sendJsonRequest("/CourseEditor/ChangeLessonNodeIndex", "POST", {
            nodeId: node.id,
            newIndex
        });
        if(result && result.success) {
            setNode(node => {
                if(!node) return null;
                return {
                    ...node,
                    index: result.data.index
                };
            });
            onChangeIndex(node.id, newIndex);
        }
        setLoading(false);
    }

    const handleResetNode = () => {
        if (!node) {
            return;
        }
        setNodeText(node.text ?? "");
        setNodeType(node.type);
        setQuestionCorrectAnswer(node.correctAnswer ?? "");
        setQuestionsAnswers(node.answers);
    }

    const getEditorForm = () => {
        const nodeTypes = [
            { name: "Text block", value: 1 },
            { name: "Singlechoice question", value: 2 },
            { name: "Multichoice question", value: 3 },
            { name: "Text question", value: 4 }
        ];
        let fields = (<></>);
        switch (nodeType) {
            case 2:
                fields = (
                    <FormGroup>
                        <FormLabel>Answers</FormLabel>
                        {questionAnswers.map((answer, i) => (
                            <div className="d-flex gap-3 align-items-center mb-2" key={i}>
                                <FormControl value={answer.text} onChange={(e) => handleEditAnswerText(i, e.target.value)} placeholder={`Answer ${i + 1}`} required />
                                <FormCheck name="answer-correct" type="radio" label="Correct" id={"answer-correct-input-" + i} checked={answer.correct} onChange={(e) => toggleCorrectAnswer(i, e.target.checked, true)} />
                                <span className="wb-user-comment__options__item" onClick={() => handleRemoveAnswer(i)}><FaTrash /></span>
                            </div>
                        ))}
                        <div>
                            <Button size="sm" className="mt-2" onClick={() => handleAddAnswer(true)} disabled={questionAnswers.length >= 4}><FaPlus className="me-1" /> Add answer</Button>
                        </div>
                    </FormGroup>
                );
                break;
            case 3:
                fields = (
                    <FormGroup>
                        <FormLabel>Answers</FormLabel>
                        {questionAnswers.map((answer, i) => (
                            <div className="d-flex gap-3 align-items-center mb-2" key={i}>
                                <FormControl value={answer.text} onChange={(e) => handleEditAnswerText(i, e.target.value)} placeholder={`Answer ${i + 1}`} required />
                                <FormCheck name="answer-correct" type="checkbox" label="Correct" id={"answer-correct-input-" + i} checked={answer.correct} onChange={(e) => toggleCorrectAnswer(i, e.target.checked, false)} />
                                <span className="wb-user-comment__options__item" onClick={() => handleRemoveAnswer(i)}><FaTrash /></span>
                            </div>
                        ))}
                        <div>
                            <Button size="sm" className="mt-2" onClick={() => handleAddAnswer(false)} disabled={questionAnswers.length >= 4}><FaPlus className="me-1" /> Add answer</Button>
                        </div>
                    </FormGroup>
                );
                break;
            case 4:
                fields = (<FormGroup>
                    <FormLabel>Correct answer</FormLabel>
                    <FormControl value={questionCorrectAnswer} onChange={(e) => setQuestionCorrectAnswer(e.target.value)} required />
                </FormGroup>);
                break;
        }
        return (
            node !== null &&
            <div className="mt-2">
                <Form onSubmit={handleSaveNode}>
                    <FormGroup>
                        <FormLabel>Type</FormLabel>
                        <FormSelect value={nodeType} onChange={(e) => setNodeType(Number(e.target.value))} required>
                            {nodeTypes.map(type =>
                                <option key={type.value} value={type.value}>{type.name}</option>
                            )}
                        </FormSelect>
                    </FormGroup>
                    <FormGroup>
                        <FormLabel>Text</FormLabel>
                        <FormControl value={nodeText} onChange={(e) => setNodeText(e.target.value)} as="textarea" rows={3} required />
                    </FormGroup>
                    {fields}
                    <div className="d-sm-flex justify-content-between mt-4">
                        <div className="d-flex gap-2 justify-content-end">
                            <Button size="sm" disabled={loading || node.index <= 1} onClick={() => handleChangeIndex(node.index - 1)}>Move left</Button>
                            <Button size="sm" disabled={loading || node.index >= nodeCount} onClick={() => handleChangeIndex(node.index + 1)}>Move right</Button>
                        </div>
                        <div className="d-flex gap-2 justify-content-end mt-2 mt-sm-0">
                            <Button size="sm" disabled={loading} variant="secondary" onClick={handleResetNode}>Reset</Button>
                            <Button size="sm" disabled={loading} variant="secondary" type="button" onClick={() => setDeleteModalVisible(true)}>Delete</Button>
                            <Button size="sm" disabled={loading} type="submit">Save</Button>
                        </div>
                    </div>
                </Form>
            </div>
        );
    }

    return (
        node !== null &&
        <>
            <Modal show={deleteModalVisible} onHide={closeDeleteModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>Lesson node will be permanently deleted.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleDeleteNode}>Delete</Button>
                </Modal.Footer>
            </Modal>
            {message[1] && <Alert variant={message[0]} onClose={() => setMessage(["", ""])} dismissible>{message[1]}</Alert>}
            {getEditorForm()}
        </>
    );
}

export default LessonNodeEditor;