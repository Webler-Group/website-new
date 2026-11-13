import { Button, Form } from "../../../components/ui";
import { SubmitEvent, useEffect, useState } from "react";
import { FaPlus, FaAlignLeft, FaLevelUpAlt, FaStopwatch, FaMemory } from "react-icons/fa";
import { useApi } from '../../../context/apiCommunication';
import { useNavigate } from "react-router-dom";
import TestCaseForm from "../components/TestCaseForm";
import ChallengeTemplateForm from "../components/ChallengeTemplateForm";
import { useSnackbar } from "../../../context/SnackbarProvider";
import MdEditorField from "../../../components/MdEditorField";
import InputTags from "../../../components/InputTags";
import { ChallengeTemplate, ChallengeTestCase, CreateChallengeData, EditChallengeData, GetEditedChallengeData } from "../types";

interface IChallengeCreateFormProps {
    challengeId?: string;
}

const ChallengeCreateForm = ({ challengeId }: IChallengeCreateFormProps) => {

    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [difficulty, setDifficulty] = useState("easy");
    const [description, setDescription] = useState("");
    const [testCases, setTestCases] = useState<ChallengeTestCase[]>([]);
    const [templates, setTemplates] = useState<ChallengeTemplate[]>([]);
    const [isVisible, setIsVisible] = useState(true);
    const [solution, setSolution] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    // Empty means no limit
    const [timeLimit, setTimeLimit] = useState("");
    const [memoryLimit, setMemoryLimit] = useState("");
    const [error, setError] = useState("");
    const { showMessage } = useSnackbar();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (challengeId) {
            getChallenge();
        }
    }, [challengeId]);

    const getChallenge = async () => {
        setLoading(true);
        const result = await sendJsonRequest<GetEditedChallengeData>(`/Challenge/GetUpdatedChallenge`, "POST", { challengeId });
        if (result.data) {
            setTitle(result.data.challenge.title);
            setDescription(result.data.challenge.description);
            setDifficulty(result.data.challenge.difficulty);
            setTestCases(result.data.challenge.testCases);
            setTemplates(result.data.challenge.templates);
            setIsVisible(result.data.challenge.isPublic);
            setSolution(result.data.challenge.solution ?? "");
            setTags(result.data.challenge.tags ?? []);
            setTimeLimit(result.data.challenge.timeLimit?.toString() ?? "");
            setMemoryLimit(result.data.challenge.memoryLimit?.toString() ?? "");
        }
        setLoading(false);
    }

    const limits = () => ({
        timeLimit: timeLimit.trim() ? Number(timeLimit) : null,
        memoryLimit: memoryLimit.trim() ? Number(memoryLimit) : null
    });

    const handleCreateChallenge = async () => {
        const result = await sendJsonRequest<CreateChallengeData>(`/Challenge/Create`, "POST", {
            title,
            description,
            difficulty,
            testCases,
            templates,
            isVisible: isVisible ? 1 : 0,
            solution,
            tags,
            ...limits()
        });
        if (result.data) {
            showMessage(`Challenge created Successfully`);

            navigate("/Challenge/" + result.data.challenge.id);
        } else {
            setError(result.error?.[0].message ?? "Something went wrong");
        }
    }

    const handleUpdateChallenge = async () => {
        const result = await sendJsonRequest<EditChallengeData>(`/Challenge/Update`, "POST", {
            challengeId,
            title,
            description,
            difficulty,
            testCases,
            templates,
            isVisible: isVisible ? 1 : 0,
            solution,
            tags,
            ...limits()
        });
        if (result.data) {
            showMessage(`Challenge updated Successfully`);

            navigate("/Challenge/" + result.data.id);
        } else {
            setError(result.error?.[0].message ?? "Something went wrong");
        }
    }


    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        challengeId ? await handleUpdateChallenge() : await handleCreateChallenge();

        setLoading(false);
    };

    return (
        <div>
            <h4 className="mb-3">
                <FaPlus className="me-2" /> {challengeId ? "Update" : "Create"} Challenge
            </h4>
            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                    <Form.Label>Title</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Enter challenge title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label htmlFor="challenge-tags">Tags</Form.Label>
                    <InputTags id="challenge-tags" values={tags} setValues={setTags} placeholder="Add tag..." />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>
                        <FaAlignLeft className="me-2" /> Description
                    </Form.Label>
                    <MdEditorField
                        section="CourseEditor"
                        rootAlias="lesson-images"
                        text={description}
                        setText={setDescription}
                        placeHolder="Describe the challenge..."
                        maxCharacters={8192}
                        row={10}
                        isPost={false}
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>
                        <FaAlignLeft className="me-2" /> Solution (Markdown)
                    </Form.Label>
                    <MdEditorField
                        section="CourseEditor"
                        rootAlias="lesson-images"
                        text={solution}
                        setText={setSolution}
                        placeHolder="Provide a solution or explanation..."
                        row={10}
                        isPost={false}
                        required={false}
                    />
                </Form.Group>

                <TestCaseForm testCases={testCases} setTestCases={setTestCases} />

                <ChallengeTemplateForm languages={templates} setLanguages={setTemplates} />

                <Form.Group className="mt-3">
                    <Form.Label>
                        <FaLevelUpAlt className="me-2" /> Difficulty
                    </Form.Label>
                    <Form.Select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                    >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </Form.Select>
                </Form.Group>

                <div className="row g-3 mt-0">
                    <Form.Group className="col-sm-6">
                        <Form.Label htmlFor="challenge-time-limit">
                            <FaStopwatch className="me-2" /> Time limit (ms)
                        </Form.Label>
                        <Form.Control
                            id="challenge-time-limit"
                            type="number"
                            min={10}
                            max={10000}
                            step={1}
                            placeholder="No limit"
                            value={timeLimit}
                            onChange={(e) => setTimeLimit(e.target.value)}
                        />
                        <Form.Text className="text-muted">CPU time per test, up to 10000 ms. Leave empty for no limit.</Form.Text>
                    </Form.Group>
                    <Form.Group className="col-sm-6">
                        <Form.Label htmlFor="challenge-memory-limit">
                            <FaMemory className="me-2" /> Memory limit (MB)
                        </Form.Label>
                        <Form.Control
                            id="challenge-memory-limit"
                            type="number"
                            min={1}
                            step={1}
                            placeholder="No limit"
                            value={memoryLimit}
                            onChange={(e) => setMemoryLimit(e.target.value)}
                        />
                        <Form.Text className="text-muted">
                            Peak memory per test. Runtimes need some on their own: about 4 MB for C, C++, Go, Rust and Lua, 8 MB for Python, 13 MB for Ruby, 24 MB for C#, 38 MB for Java and Kotlin, 42 MB for JavaScript and TypeScript.
                        </Form.Text>
                    </Form.Group>
                </div>

                <Form.Group className="mt-3">
                    <Form.Check
                        type="checkbox"
                        label="Public?"
                        checked={isVisible}
                        onChange={(e) => setIsVisible(e.target.checked)}
                    />
                </Form.Group>

                <p className="col text-danger">{error}</p>

                <div className="d-flex justify-content-end gap-2">
                    <Button to={challengeId ? "/Challenge/" + challengeId : "/Challenge"} variant="secondary" disabled={loading}>
                            Cancel
                        </Button>
                    <Button type="submit" variant="primary" disabled={loading} >
                        {
                            challengeId ? "Update" : "Create"
                        }
                    </Button>
                </div>
            </Form>
        </div>
    );
}


export default ChallengeCreateForm;