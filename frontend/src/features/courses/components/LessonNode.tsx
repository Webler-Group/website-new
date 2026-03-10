import { useEffect, useState } from "react";
import { Button, FormControl } from "react-bootstrap";
import { useApi } from "../../../context/apiCommunication";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import HtmlRenderer from "../../../components/HtmlRenderer";
import { GetLessonNodeData, LessonNodeDetails, SolveData } from "../types";
import LessonNodeTypeEnum from "../../../data/LessonNodeTypeEnum";
import LessonNodeModeEnum from "../../../data/LessonNodeModeEnum";

interface LessonNodeProps {
    nodeId?: string;
    nodeData?: LessonNodeDetails;
    mock: boolean;
    onEnter?: (id: string) => void;
    onAnswered?: (id: string, correct: boolean) => void;
    onContinue?: (id: string) => void;
}

const allowedUrls = [
    /^https?:\/\/.+/i,
    /^\/.*/
];

const LessonNode = ({ nodeData, nodeId, mock, onAnswered, onContinue, onEnter }: LessonNodeProps) => {
    const [node, setNode] = useState<LessonNodeDetails | null>(null);
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
            onEnter?.(nodeData.id);
        } else {
            const result = await sendJsonRequest<GetLessonNodeData>("/Courses/GetLessonNode", "POST", {
                nodeId,
                mock
            });
            if (result.data) {
                setNode(result.data.lessonNode);
                onEnter?.(nodeId!);
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

        const result = await sendJsonRequest<SolveData>("/Courses/SolveNode", "POST", {
            nodeId: node.id,
            mock: nodeData ? {
                type: nodeData.type,
                correctAnswer: nodeData.correctAnswer,
                answers: nodeData.answers
            } : undefined,
            answers: node.answers.map(a => ({
                id: a.id,
                correct: selectedAnswers.includes(a.id)
            })),
            correctAnswer: textAnswer
        });
        if (result.data) {
            setIsCorrect(result.data.correct);
            onAnswered?.(node.id, result.data.correct);
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
        onContinue?.(node.id);
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

    const activeNode = nodeData || node;

    if (activeNode) {
        const renderAnswers = () =>
            activeNode.answers.map((answer, idx) => (
                <div
                    key={idx}
                    className={`wb-courses-lesson-answer p-2 mt-3 ${getAnswerClass(answer.id!)}`}
                    role="button"
                    onClick={() => {
                        activeNode.type === LessonNodeTypeEnum.SINGLECHOICE_QUESTION
                            ? handleSingleChoice(answer.id!)
                            : handleMultiChoice(answer.id!);
                    }}
                >
                    <div className="card-body">{answer.text}</div>
                </div>
            ));

        const renderContent = () => {
            if (activeNode.type === LessonNodeTypeEnum.CODE && activeNode.code) {
                const code = activeNode.code!;
                const genOutput = () => {
                    const doc = new DOMParser().parseFromString(code.source, "text/html");
                    const head = doc.head || doc.getElementsByTagName("head")[0];
                    const body = doc.body || doc.getElementsByTagName("body")[0];

                    const style = document.createElement("style");
                    style.appendChild(document.createTextNode(code.cssSource));
                    head.appendChild(style);

                    const script = document.createElement("script");
                    script.text = code.jsSource;
                    body.appendChild(script);

                    return "<!DOCTYPE HTML>\n" + doc.documentElement.outerHTML;
                };

                return (
                    <div style={{ height: "80vh" }}>
                        <iframe
                            key={code.name + "_" + code.source.length} // Force reload when snippet changes
                            title={code.name}
                            srcDoc={genOutput()}
                            style={{ width: "100%", height: "100%", border: "none" }}
                            sandbox="allow-scripts"
                        />
                    </div>
                );
            }

            if (activeNode.mode === LessonNodeModeEnum.HTML) {
                return <HtmlRenderer html={activeNode.text} />
            }

            return <MarkdownRenderer content={activeNode.text} allowedUrls={allowedUrls} />;
        };

        content = (
            <div className="h-100 d-flex flex-column">
                <div className={"wb-courses-lesson-node-question flex-grow-1" + (activeNode.type === 5 ? " wb-code-mode" : " p-2")}>
                    {renderContent()}

                    {(activeNode.type === 2 || activeNode.type === 3) && <div className="p-2">{renderAnswers()}</div>}
                    {activeNode.type === 4 && (
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
                    {(activeNode.type === 1 || activeNode.type === 5) ?
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
                                        (activeNode.type === 4 && textAnswer.trim() === "") ||
                                        ((activeNode.type === 2 || activeNode.type === 3) &&
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

export default LessonNode;
