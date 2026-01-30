import { useEffect, useState } from "react";
import { Form, Button } from "react-bootstrap";
import { FaPlus, FaAlignLeft, FaLevelUpAlt } from "react-icons/fa";
import { useApi } from '../../../context/apiCommunication';
import { useNavigate } from "react-router-dom";
import TestCaseForm from "../components/TestCaseForm";
import { IChallengeTemplate, ITestCase } from "../types";
import ChallengeTemplateForm from "../components/ChallengeTemplateForm";
import { useSnackbar } from "../../../context/SnackbarProvider";
import { LinkContainer } from "react-router-bootstrap";
import MdEditorField from "../../../components/MdEditorField";

interface IChallengeCreateFormProps {
    challengeId?: string;
}

const ChallengeCreateForm = ({ challengeId }: IChallengeCreateFormProps) => {

    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [difficulty, setDifficulty] = useState("easy");
    const [description, setDescription] = useState("");
    const [testCases, setTestCases] = useState<ITestCase[]>([]);
    const [templates, setTemplates] = useState<IChallengeTemplate[]>([]);
    const [xp, setXP] = useState(10);
    const [isVisible, setIsVisible] = useState(true);
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
        const result = await sendJsonRequest(`/Challenge/GetUpdatedChallenge`, "POST", { challengeId });
        if (result && result.challenge) {
            setTitle(result.challenge.title);
            setDescription(result.challenge.description);
            setDifficulty(result.challenge.difficulty);
            setTestCases(result.challenge.testCases);
            setTemplates(result.challenge.templates);
            setXP(result.challenge.xp);
            setIsVisible(result.challenge.isPublic);
        }
        setLoading(false);
    }

    const handleCreateChallenge = async () => {
        const result = await sendJsonRequest(`/Challenge/Create`, "POST", {
            title,
            description,
            difficulty,
            testCases,
            templates,
            xp,
            isVisible: isVisible ? 1 : 0
        });
        if (result && result.challenge) {
            showMessage(`Challenge created Successfully`);

            navigate("/Challenge/" + result.challenge.id);
        } else {
            setError(result?.error[0].message ?? "Something went wrong");
        }
    }

    const handleUpdateChallenge = async () => {
        const result = await sendJsonRequest(`/Challenge/Update`, "POST", {
            challengeId,
            title,
            description,
            difficulty,
            testCases,
            templates,
            xp,
            isVisible: isVisible ? 1 : 0
        });
        if (result && result.data) {
            showMessage(`Challenge updated Successfully`);

            navigate("/Challenge/" + result.data.id);
        } else {
            setError(result?.error[0].message ?? "Something went wrong");
        }
    }


    const handleSubmit = async (e: React.FormEvent) => {
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
                    <Form.Label>
                        <FaAlignLeft className="me-2" /> Description
                    </Form.Label>
                    <MdEditorField
                        text={description}
                        setText={setDescription}
                        placeHolder="Describe the challenge..."
                        row={10}
                        isPost={false}
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

                <Form.Group className="mt-3">
                    <Form.Label>XP</Form.Label>
                    <Form.Control
                        type="number"
                        min={0}
                        value={xp}
                        placeholder="XP"
                        onChange={(e) =>
                            setXP(Number(e.target.value))
                        }
                    />
                </Form.Group>

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
                    <LinkContainer to={challengeId ? "/Challenge/" + challengeId : "/Challenge"}>
                        <Button type="button" variant="secondary" disabled={loading}>
                            Cancel
                        </Button>
                    </LinkContainer>
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