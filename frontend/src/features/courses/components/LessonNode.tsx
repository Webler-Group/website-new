import { useEffect, useState } from "react";
import { Button, FormControl } from "react-bootstrap";
import { useApi } from "../../../context/apiCommunication";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import HtmlRenderer from "../../../components/HtmlRenderer";
import { GetLessonNodeData, LessonNodeDetails, SolveData } from "../types";
import LessonNodeTypeEnum from "../../../data/LessonNodeTypeEnum";
import LessonNodeModeEnum from "../../../data/LessonNodeModeEnum";
import { CodeDetails, GetCodeData } from "../../codes/types";

interface LessonNodeProps {
    nodeId?: string;
    nodeData?: LessonNodeDetails;
    mock: boolean;
    css?: string;
    onAnswered?: (id: string, correct: boolean) => void;
    onContinue?: (id: string) => void;
}

const allowedUrls = [
    /^https?:\/\/.+/i,
    /^\/.*/
];


const LessonNode = ({ nodeData, nodeId, mock, css, onAnswered, onContinue }: LessonNodeProps) => {
    const [node, setNode] = useState<LessonNodeDetails | null>(null);
    const [code, setCode] = useState<CodeDetails | null>(null);
    const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
    const [textAnswer, setTextAnswer] = useState("");
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const { sendJsonRequest } = useApi();

    const activeNode = nodeData ?? node;

    useEffect(() => {
        setSelectedAnswers([]);
        setTextAnswer("");
        setIsCorrect(null);
        getNode();
    }, [nodeId]);

    useEffect(() => {
        if (activeNode?.type !== LessonNodeTypeEnum.CODE || !activeNode?.codeId) {
            setCode(null);
            return;
        }

        const fetchCode = async () => {
            const result = await sendJsonRequest<GetCodeData>("/Codes/GetCode", "POST", { codeId: activeNode.codeId });
            if (result.data) {
                setCode(result.data.code);
            }
        };

        fetchCode();
    }, [activeNode?.codeId, activeNode?.type]);

    const getNode = async () => {
        if (nodeData) {
            setNode(nodeData);
        } else {
            const result = await sendJsonRequest<GetLessonNodeData>("/Courses/GetLessonNode", "POST", {
                nodeId,
                mock
            });
            if (result.data) {
                setNode(result.data.lessonNode);
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
        if (!activeNode) return;

        const result = await sendJsonRequest<SolveData>("/Courses/SolveNode", "POST", {
            nodeId: activeNode.id,
            mock: nodeData ? {
                type: nodeData.type,
                correctAnswer: nodeData.correctAnswer,
                answers: nodeData.answers
            } : undefined,
            answers: activeNode.answers.map(a => ({
                id: a.id,
                correct: selectedAnswers.includes(a.id)
            })),
            correctAnswer: textAnswer
        });
        if (result.data) {
            setIsCorrect(result.data.correct);
            if (activeNode.type === LessonNodeTypeEnum.TEXT || activeNode.type === LessonNodeTypeEnum.CODE) {
                onContinue?.(activeNode.id);
            } else {
                onAnswered?.(activeNode.id, result.data.correct);
            }
        }
    };

    const handleTryAgain = () => {
        setSelectedAnswers([]);
        setIsCorrect(null);
    };

    const handleContinue = () => {
        if (!activeNode) return;
        onContinue?.(activeNode.id);
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

    if (activeNode) {
        const renderAnswers = () => (
            <div className="d-flex flex-column gap-2">
                {
                    activeNode.answers.map((answer, idx) => (
                        <div
                            key={idx}
                            className={`wb-courses-lesson-answer p-2 ${getAnswerClass(answer.id!)}`}
                            role="button"
                            onClick={() => {
                                activeNode.type === LessonNodeTypeEnum.SINGLECHOICE_QUESTION
                                    ? handleSingleChoice(answer.id!)
                                    : handleMultiChoice(answer.id!);
                            }}
                        >
                            <div className="card-body">{answer.text}</div>
                        </div>

                    ))
                }
            </div>
        );

        const renderContent = () => {
            if (activeNode.type === LessonNodeTypeEnum.CODE && code) {
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
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <iframe
                            key={code.name + "_" + code.source.length}
                            title={code.name}
                            srcDoc={genOutput()}
                            style={{ width: "100%", height: "100%", border: "none" }}
                            sandbox="allow-scripts"
                        />
                    </div>
                );
            }

            if (activeNode.mode === LessonNodeModeEnum.HTML) {
                return (
                    <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                        <HtmlRenderer html={activeNode.text} css={css} />
                    </div>
                )
            }

            return (
                <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                    <MarkdownRenderer content={activeNode.text} allowedUrls={allowedUrls} />
                </div>
            );
        };

        content = (
            <div className="h-100 d-flex flex-column">
                <div className={"wb-courses-lesson-node-question flex-grow-1" + (activeNode.type === LessonNodeTypeEnum.CODE ? " wb-code-mode" : " px-2")}>
                    {renderContent()}

                    {(activeNode.type === LessonNodeTypeEnum.SINGLECHOICE_QUESTION || activeNode.type === LessonNodeTypeEnum.MULTICHOICE_QUESTION) && <div className="my-3">{renderAnswers()}</div>}
                    {activeNode.type === LessonNodeTypeEnum.TEXT_QUESTION && (
                        <div className="d-flex justify-content-center my-3">
                            <FormControl
                                className={"wb-courses-lesson-answer" + (isCorrect === null ? "" : isCorrect ? " correct" : " incorrect")}
                                style={{ width: "240px" }}
                                value={textAnswer}
                                readOnly={isCorrect !== null}
                                onChange={(e) => handleTextAnswer(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className="text-center bg-light p-2">
                    {(activeNode.type === LessonNodeTypeEnum.TEXT || activeNode.type === LessonNodeTypeEnum.CODE) ?
                        <Button variant="success" onClick={handleSubmit}>
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
                                        (activeNode.type === LessonNodeTypeEnum.TEXT_QUESTION && textAnswer.trim() === "") ||
                                        ((activeNode.type === LessonNodeTypeEnum.SINGLECHOICE_QUESTION || activeNode.type === LessonNodeTypeEnum.MULTICHOICE_QUESTION) &&
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