import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import { FaPen, FaSearch } from "react-icons/fa";
import { compilerLanguages, languagesInfo } from "../../../data/compilerLanguages";
import { truncate } from "../../../utils/StringUtils";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import Loader from "../../../components/Loader";
import { useAuth } from "../../auth/context/authContext";
import { Button, Container, FormLabel, FormSelect, InputGroup } from "react-bootstrap";
import ChallengeCodeEditor from "../components/ChallengeCodeEditor";
import { IChallenge } from "../types";
import LanguageIcons from "../components/LanguageIcons";

const ChallengeDetailsPage = () => {
    const { challengeId } = useParams();
    const navigate = useNavigate();
    const { userInfo } = useAuth();
    const { sendJsonRequest } = useApi();

    const [loading, setLoading] = useState(false);
    const [challenge, setChallenge] = useState<IChallenge | null>(null);
    const [languageChoice, setLanguageChoice] = useState("");
    const [selectedLanguage, setSelectedLanguage] = useState<compilerLanguages | null>(null);

    useEffect(() => {
        getChallenge();
    }, [challengeId]);

    const getChallenge = async () => {
        if (!challengeId) return;
        setLoading(true);
        const result = await sendJsonRequest("/Challenge/GetChallenge", "POST", {
            challengeId,
        });
        if (result && result.challenge) {
            setChallenge(result.challenge);
        }
        setLoading(false);
    };

    const closeCodeEditorModal = () => {
        setSelectedLanguage(null);
    }

    const handleLanguageSelect = (key: compilerLanguages) => {
        setSelectedLanguage(key);
    }

    return (
        challenge != null ?
            <>
                <ChallengeCodeEditor challenge={challenge} language={selectedLanguage} onExit={closeCodeEditorModal} />
                <Container>
                    <div className="d-flex gap-2 py-2">
                        <Link to="/Challenge">Challenges</Link>
                        <span>&rsaquo;</span>
                        <span>{truncate(challenge.title, 25)}</span>
                    </div>

                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h3 className="mb-1">{challenge.title}</h3>
                            <span
                                className={`badge ${challenge.difficulty === "easy"
                                    ? "bg-success"
                                    : challenge.difficulty === "medium"
                                        ? "bg-warning text-dark"
                                        : "bg-danger"
                                    }`}
                            >
                                {challenge.difficulty}
                            </span>
                        </div>
                        {
                            userInfo?.roles.some(x => ["Admin", "Creator"].includes(x)) &&
                            <div>
                                <FaPen
                                    role="button"
                                    title="Edit Challenge"
                                    onClick={() => navigate(`/Challenge/Edit/${challenge.id}`)}
                                    className="text-muted"
                                    style={{ cursor: "pointer" }}
                                />
                            </div>
                        }
                    </div>

                    <MarkdownRenderer content={challenge.description} />

                    <div className="mt-2">
                        <LanguageIcons challenge={challenge} />
                    </div>

                    <div className="mt-4">
                        <FormLabel className="fw-semibold">Select language for solution:</FormLabel>
                        <InputGroup className="mb-2" size="sm" style={{ maxWidth: "400px" }}>
                            <FormSelect
                                value={languageChoice}
                                onChange={(e) => setLanguageChoice(e.target.value)}
                            >
                                <option value="">-- Select Language --</option>
                                {Object.entries(languagesInfo).filter(([key]) => key != "web").map(([key, info]) =>
                                    <option key={key} value={key}>
                                        {info.displayName}
                                    </option>
                                )}
                            </FormSelect>
                            <Button
                                variant="primary"
                                disabled={!languageChoice}
                                onClick={() => handleLanguageSelect(languageChoice as compilerLanguages)}
                            >
                                Open Editor
                            </Button>
                        </InputGroup>
                    </div>
                </Container>
            </>
            :
            loading ?
                <div className="d-flex justify-content-center align-items-center py-5">
                    <Loader />
                </div>
                :
                <div className="d-flex h-100 py-5 flex-column align-items-center justify-content-center text-center">
                    <h4>
                        <FaSearch />
                    </h4>
                    <h5>Challenge not found</h5>
                    <div>
                        <Link to="/Challenge">Go back</Link>
                    </div>
                </div>
    );
};

export default ChallengeDetailsPage;
