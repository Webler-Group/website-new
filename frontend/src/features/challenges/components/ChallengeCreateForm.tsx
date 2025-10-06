import { useEffect, useState } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import { FaPlus, FaAlignLeft, FaLevelUpAlt } from "react-icons/fa";
import { useApi } from '../../../context/apiCommunication';
import { useNavigate } from "react-router-dom";
import TestCaseForm from "../components/TestCaseForm";
import IChallenge, { IChallengeTemplate, ITestCase } from "../IChallenge";
import ChallengeTemplateForm from "../components/ChallengeTemplateForm";
import { useSnackbar } from "../../../context/SnackbarProvider";
import { LinkContainer } from "react-router-bootstrap";


interface IChallengeCreateFormProps {
    challenge?: IChallenge;
    challengeId?: string;
}

const ChallengeCreateForm = ({ challenge, challengeId }: IChallengeCreateFormProps) => {

    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [xp, setXP] = useState(10);
    const [error, setError] = useState("");
    const [difficulty, setDifficulty] = useState("easy");
    const [description, setDescription] = useState("");
    const [submitBtnDisabled, setSubmitBtnDisabled] = useState(false);
    const { showMessage } = useSnackbar();

    const [testCases, setTestCases] = useState<ITestCase[]>([]);

    const [templates, setTemplates] = useState<IChallengeTemplate[]>([]);

    useEffect(() => {
        setDefaultEdit();
    }, []);

    const setDefaultEdit = () => {
        if (challenge) {
            setTitle(challenge.title);
            setXP(challenge.xp);
            setDifficulty(challenge?.difficulty);
            setDescription(challenge?.description);
            if (challenge.testCases) setTestCases(challenge.testCases);
            if (challenge.templates) setTemplates(challenge.templates);
        }
    }


    const createRequest = async () => {
        const result = await sendJsonRequest(`/Challenge/Create`, "POST", {
            title,
            description,
            difficulty,
            testCases,
            templates,
            xp
        });
        return result;
    }

    const updateRequest = async () => {
        const result = await sendJsonRequest(`/Challenge/Update`, "POST", {
            challengeId,
            title,
            description,
            difficulty,
            testCases,
            templates,
            xp
        });
        return result;
    }


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitBtnDisabled(true);

        const result = challengeId ? await updateRequest() : await createRequest();

        setSubmitBtnDisabled(false);

        if (result) {

            if (!result.success) {
                setError(result.message);
                return;
            }

            showMessage(`Challenge ${challengeId ? "Updated" : "Created"} Successfully`);

            navigate("../");
        } else {
            setError("Something went wrong");
        }

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
                    <Form.Control
                        as="textarea"
                        rows={5}
                        placeholder="Describe the challenge..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                </Form.Group>

                <Col>
                    <TestCaseForm testCases={testCases} setTestCases={setTestCases} />
                </Col>

                <Col>
                    <ChallengeTemplateForm languages={templates} setLanguages={setTemplates} />
                </Col>

                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3">
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
                    </Col>

                    <p className="col text-danger">{error}</p>
                </Row>

                <div className="d-flex justify-content-end gap-2">
                    <LinkContainer to={challengeId ? "/Challenge/" + challengeId : "/Challenge"}>
                        <Button type="button" variant="secondary" disabled={submitBtnDisabled}>
                            Cancel
                        </Button>
                    </LinkContainer>
                    <Button type="submit" variant="primary" disabled={submitBtnDisabled} >
                        <FaPlus className="me-2" /> {
                            challengeId ? "Update Challenge" : "Create Challenge"
                        }
                    </Button>
                </div>
            </Form>
        </div>
    );
}


export default ChallengeCreateForm;