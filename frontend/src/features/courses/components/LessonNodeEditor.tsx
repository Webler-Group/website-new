import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Form, FormCheck, FormControl, FormGroup, FormLabel, FormSelect, Modal } from "react-bootstrap";
import { FaPlus, FaTrash } from "react-icons/fa6";
import { useApi } from "../../../context/apiCommunication";
import { ILessonNode, ILessonNodeAnswer } from "./LessonNode";

interface LessonNodeEditorProps {
    nodeId: string;
    nodeCount: number;
    onDelete: (nodeId: string) => void;
    onChangeIndex: (nodeId: string, newIndex: number) => void;
    onPreview: (nodeId: string) => void;
}

const LessonNodeEditor = ({ nodeId, nodeCount, onDelete, onChangeIndex, onPreview }: LessonNodeEditorProps) => {
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

    const hasUnsavedChanges = () => {
        return node && (
            nodeType != node.type ||
            nodeText.trim() != node.text ||
            questionCorrectAnswer != node.correctAnswer ||
            questionAnswers.length != node.answers.length ||
            !node.answers.every(x => {
                const answer = questionAnswers.find(y => y.id == x.id);
                return answer && answer.text == x.text && answer.correct == x.correct;
            })
        );
    }

    const validateNode = (showMessage: boolean) => {
        if ((nodeType == 2 || nodeType == 3)) {
            if (questionAnswers.length < 2) {
                if (showMessage) setMessage(["danger", "Question cannot have less than 2 answers"]);
                return false;
            } else if (questionAnswers.length > 4) {
                if (showMessage) setMessage(["danger", "Question cannot have more than 4 answers"]);
                return false;
            }
        } else if (nodeType == 4 && questionCorrectAnswer.length == 0) {
            if (showMessage) setMessage(["danger", "Correct answer cannot be empty"]);
            return false;
        }
        return true;
    }

    const saveNode = async (showMessage: boolean) => {
        if (!node) {
            return false;
        }

        if (!validateNode(showMessage)) {
            return false;
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
            if (showMessage) setMessage(["success", "Lessson node was saved successfully."]);
            return true;
        } else {
            if (showMessage) setMessage(["danger", result?.error[0].message]);
        }
        return false;
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await saveNode(true);
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
        if (!node) {
            return;
        }

        setLoading(true);
        const success = hasUnsavedChanges() ? await saveNode(true) : validateNode(true);
        if (success) {
            const result = await sendJsonRequest("/CourseEditor/ChangeLessonNodeIndex", "POST", {
                nodeId: node.id,
                newIndex
            });
            if (result && result.success) {
                setNode(node => {
                    if (!node) return null;
                    return {
                        ...node,
                        index: result.data.index
                    };
                });
                onChangeIndex(node.id, newIndex);
                setMessage(["success", "Node index changed successfully."]);
            } else {
                setMessage(["danger", result?.error[0].message]);
            }
        }
        setLoading(false);
    }

    const handlePreview = async () => {
        setLoading(true);
        const success = hasUnsavedChanges() ? await saveNode(true) : validateNode(true);
        setLoading(false);
        if (success) {
            onPreview(nodeId);
        }
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
                                <span className="wb-comments__options__item" onClick={() => handleRemoveAnswer(i)}><FaTrash /></span>
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
                                <FormControl value={answer.text} onChange={(e) => handleEditAnswerText(i, e.target.value)} placeholder={`Answer ${i + 1}`} required  maxLength={120} />
                                <FormCheck name="answer-correct" type="checkbox" label="Correct" id={"answer-correct-input-" + i} checked={answer.correct} onChange={(e) => toggleCorrectAnswer(i, e.target.checked, false)} />
                                <span className="wb-comments__options__item" onClick={() => handleRemoveAnswer(i)}><FaTrash /></span>
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
                    <FormControl value={questionCorrectAnswer} onChange={(e) => setQuestionCorrectAnswer(e.target.value)} required maxLength={60} />
                </FormGroup>);
                break;
        }
        return (
            node !== null &&
            <div className="mt-2">
                <Form onSubmit={handleSubmit}>
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
                        <FormControl value={nodeText} onChange={(e) => setNodeText(e.target.value)} as="textarea" rows={10} maxLength={2000} required />
                    </FormGroup>
                    {fields}
                    <div className="d-sm-flex justify-content-between mt-4">
                        <div className="d-flex gap-2 justify-content-end">
                            <Button size="sm" disabled={loading || node.index <= 1} onClick={() => handleChangeIndex(node.index - 1)}>Move left</Button>
                            <Button size="sm" disabled={loading || node.index >= nodeCount} onClick={() => handleChangeIndex(node.index + 1)}>Move right</Button>
                            <Button size="sm" disabled={loading} onClick={handlePreview}>Preview</Button>
                        </div>
                        <div className="d-flex gap-2 justify-content-end mt-2 mt-sm-0">
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