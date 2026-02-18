import { useEffect, useState } from "react";
import { Button, FormControl } from "react-bootstrap";
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
    mode?: number;
    codeId?: {
        name: string;
        source: string;
        cssSource: string;
        jsSource: string;
        language: string;
    };
    index: number;
    text: string;
    answers: ILessonNodeAnswer[];
    correctAnswer?: string;
}

interface LessonNodeProps {
    nodeId?: string;
    nodeData?: ILessonNode;
    mock: boolean;
    onEnter: (id: string) => void;
    onAnswered: (id: string, correct: boolean) => void;
    onContinue: (id: string) => void;
}

const allowedUrls = [
    /^https?:\/\/.+/i,
    /^\/.*/ 
];

const LessonNode = ({ nodeData, nodeId, mock, onAnswered, onContinue, onEnter }: LessonNodeProps) => {
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
        if (nodeData) {
            setNode(nodeData);
            onEnter(nodeData.id);
        } else {
            const result = await sendJsonRequest("/Courses/GetLessonNode", "POST", {
                nodeId,
                mock
            });
            if (result && result.lessonNode) {
                setNode(result.lessonNode);
                onEnter(nodeId!);
            }
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

        let payload: any = {
            nodeId: node.id
        };

        if (nodeData) {
            payload.mock = {
                type: nodeData.type,
                correctAnswer: nodeData.correctAnswer,
                answers: nodeData.answers
            };
        }

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
                    className={`wb-courses-lesson-answer p-2 mt-3 ${getAnswerClass(answer.id!)}`}
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

        const renderContent = () => {
            if (node.mode === 2) {
                return <div dangerouslySetInnerHTML={{ __html: node.text! }} />;
            } else if (node.mode === 3 && node.codeId) {
                const genOutput = () => {
                    const doc = new DOMParser().parseFromString(node.codeId!.source, "text/html");
                    const head = doc.head || doc.getElementsByTagName("head")[0];
                    const body = doc.body || doc.getElementsByTagName("body")[0];

                    const style = document.createElement("style");
                    style.appendChild(document.createTextNode(node.codeId!.cssSource));
                    head.appendChild(style);

                    const script = document.createElement("script");
                    script.text = node.codeId!.jsSource;
                    body.appendChild(script);

                    return "<!DOCTYPE HTML>\n" + doc.documentElement.outerHTML;
                };

                return (
                    <div style={{ height: "80vh" }}>
                        <iframe
                            title={node.codeId.name}
                            srcDoc={genOutput()}
                            style={{ width: "100%", height: "100%", border: "none" }}
                            sandbox="allow-scripts"
                        />
                    </div>
                );
            } else {
                return <MarkdownRenderer content={node.text!} allowedUrls={allowedUrls} />;
            }
        };

        content = (
            <div className="h-100 d-flex flex-column">
                <div className={"wb-courses-lesson-node-question flex-grow-1" + (node.mode === 3 ? " wb-code-mode" : " p-2")}>
                    {renderContent()}

                    {(node.type === 2 || node.type === 3) && <div className="p-2">{renderAnswers()}</div>}
                    {node.type === 4 && (
                        <div className="p-2 d-flex justify-content-center">
                            <FormControl
                                className={"wb-courses-lesson-answer p-2" + (isCorrect === null ? "" : isCorrect ? " correct" : " incorrect")}
                                style={{ width: "120px" }}
                                value={textAnswer}
                                readOnly={isCorrect !== null}
                                onChange={(e) => handleTextAnswer(e.target.value)}
                            />
                        </div>
                    )}
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
            </div>
        );
    }

    return content;
};

export type { ILessonNode, ILessonNodeAnswer };
export default LessonNode;
