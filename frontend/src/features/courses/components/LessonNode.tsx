import { useEffect, useState } from "react";
import { Button, Form, FormControl } from "react-bootstrap";
import { useApi } from "../../../context/apiCommunication";
import MarkdownRenderer from "../../../components/MarkdownRenderer";

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

interface LessonNodeProps {
    nodeId: string;
    mock: boolean;
    onEnter: (id: string) => void;
    onAnswered: (id: string, correct: boolean) => void;
    onContinue: (id: string) => void;
}

const allowedUrls = [
    /^https?:\/\/.+/i
];

const LessonNode = ({ nodeId, mock, onAnswered, onContinue, onEnter }: LessonNodeProps) => {
    const [node, setNode] = useState<ILessonNode | null>(null);
    const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
    const [textAnswer, setTextAnswer] = useState("");
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const { sendJsonRequest } = useApi();

    useEffect(() => {
        setSelectedAnswers([]);
        setTextAnswer("");
        setIsCorrect(null);
        getNode();
    }, [nodeId]);

    const getNode = async () => {
        const result = await sendJsonRequest("/Courses/GetLessonNode", "POST", {
            nodeId,
            mock
        });
        if (result && result.lessonNode) {
            setNode(result.lessonNode);
            onEnter(nodeId);
        }
    };

    const handleSingleChoice = (value: string) => {
        if (isCorrect !== null) return;
        setSelectedAnswers([value]);
    };

    const handleMultiChoice = (value: string) => {
        if (isCorrect !== null) return;
        let newAnswers = [...selectedAnswers];
        if (newAnswers.includes(value)) {
            newAnswers = newAnswers.filter(v => v !== value);
        } else {
            newAnswers.push(value);
        }
        setSelectedAnswers(newAnswers);
    };

    const handleTextAnswer = (value: string) => {
        setTextAnswer(value);
    };

    const handleSubmit = async () => {
        if (!node) return;

        let payload: any = { nodeId: node.id, mock };

        if (node.type === 2 || node.type === 3) {
            payload.answers = node.answers.map(a => ({
                id: a.id,
                correct: selectedAnswers.includes(a.id!)
            }));
        } else if (node.type === 4) {
            payload.correctAnswer = textAnswer;
        }

        const result = await sendJsonRequest("/Courses/SolveNode", "POST", payload);
        if (result && result.success) {
            setIsCorrect(result.data.correct);
            onAnswered(node.id, result.data.correct);
        }
    };

    const handleTryAgain = () => {
        setSelectedAnswers([]);
        setIsCorrect(null);
    };

    const handleContinue = () => {
        if (!node) {
            return;
        }
        onContinue(node.id);
    };

    const getAnswerClass = (answerId: string) => {
        const selected = selectedAnswers.includes(answerId);
        if (!selected) {
            return "initial";
        }

        if (isCorrect === null) {
            return "selected";
        }
        return isCorrect ? "selected correct" : "selected incorrect";
    };

    let content = <></>;

    if (node) {
        const renderAnswers = () =>
            node.answers.map((answer, idx) => (
                <div
                    key={idx}
                    className={`wb-course-lesson-answer p-2 mt-3 ${getAnswerClass(answer.id!)}`}
                    role="button"
                    onClick={() => {
                        node.type === 2
                            ? handleSingleChoice(answer.id!)
                            : handleMultiChoice(answer.id!);
                    }}
                >
                    <div className="card-body">{answer.text}</div>
                </div>
            ));

        content = (
            <Form className="h-100 d-flex flex-column">
                <div className="wb-lesson-node-question p-2 flex-grow-1">
                    <MarkdownRenderer content={node.text!} allowedUrls={allowedUrls} />

                    {node.type === 2 || node.type === 3 ? (
                        renderAnswers()
                    ) : node.type === 4 ? (
                        <div className="d-flex justify-content-center">
                            <FormControl
                                className={"wb-course-lesson-answer p-2" + (isCorrect === null ? "" : isCorrect ? " correct" : " incorrect")}
                                style={{ width: "120px" }}
                                value={textAnswer}
                                readOnly={isCorrect !== null}
                                onChange={(e) => handleTextAnswer(e.target.value)}
                            />
                        </div>
                    ) : null}
                </div>

                <div className="text-center bg-light p-3">
                    {node.type == 1 ?
                        <Button variant="success" onClick={handleContinue}>
                            Continue
                        </Button>
                        :
                        <>
                            {isCorrect === true ? (
                                <Button variant="success" onClick={handleContinue}>
                                    Continue
                                </Button>
                            ) : isCorrect === false ? (
                                <Button variant="danger" onClick={handleTryAgain}>
                                    Try Again
                                </Button>
                            ) : (
                                <Button
                                    variant="primary"
                                    onClick={handleSubmit}
                                    disabled={
                                        (node.type === 4 && textAnswer.trim() === "") ||
                                        ((node.type === 2 || node.type === 3) &&
                                            selectedAnswers.length === 0)
                                    }
                                >
                                    Check
                                </Button>
                            )}
                        </>
                    }
                </div>
            </Form>
        );
    }

    return content;
};

export type { ILessonNode, ILessonNodeAnswer };
export default LessonNode;
