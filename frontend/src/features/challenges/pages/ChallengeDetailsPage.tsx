import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import { FaPen, FaSearch, FaChevronRight, FaTrophy, FaCheckCircle, FaExclamationTriangle, FaLock, FaLightbulb, FaCode } from "react-icons/fa";
import { languagesInfo } from "../../../data/compilerLanguages";
import { truncate } from "../../../utils/StringUtils";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import Loader from "../../../components/Loader";
import { useAuth } from "../../auth/context/authContext";
import { Button, Container, FormSelect, Modal, Badge } from "react-bootstrap";
import ChallengeCodeEditor from "../components/ChallengeCodeEditor";
import LanguageIcons from "../components/LanguageIcons";
import CompilerLanguagesEnum from "../../../data/CompilerLanguagesEnum";
import { ChallengeDetails, GetChallengeData } from "../types";
import "../components/Challenge.css";

const allowedUrls = [
    /^https?:\/\/.+/i,
    /^\/.*/ 
];

const ChallengeDetailsPage = () => {
    const { challengeId } = useParams<{ challengeId: string }>();
    const navigate = useNavigate();
    const { userInfo } = useAuth();
    const { sendJsonRequest } = useApi();

    const [loading, setLoading] = useState(false);
    const [challenge, setChallenge] = useState<ChallengeDetails | null>(null);
    const [languageChoice, setLanguageChoice] = useState("");
    const [selectedLanguage, setSelectedLanguage] = useState<CompilerLanguagesEnum | null>(null);
    const [activeTab, setActiveTab] = useState("description");
    const [showUnlockModal, setShowUnlockModal] = useState(false);

    useEffect(() => {
        getChallenge();
    }, [challengeId]);

    const getChallenge = async () => {
        if (!challengeId) return;
        setLoading(true);
        const result = await sendJsonRequest<GetChallengeData>("/Challenge/GetChallenge", "POST", {
            challengeId,
        });
        if (result.data) {
            setChallenge(result.data.challenge);
        }
        setLoading(false);
    };

    const handleConfirmUnlock = async () => {
        if (!challengeId) return;
        const result = await sendJsonRequest(`/Challenge/UnlockSolution`, "POST", {
            challengeId
        });

        if (result.success) {
            setShowUnlockModal(false);
            getChallenge(); // Refresh to get the solution
        }
    };

    const closeCodeEditorModal = () => {
        setSelectedLanguage(null);
    }

    const handleLanguageSelect = (key: CompilerLanguagesEnum) => {
        setSelectedLanguage(key);
    }

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center py-5">
                <Loader />
            </div>
        );
    }

    if (!challenge) {
        return (
            <div className="d-flex h-100 py-5 flex-column align-items-center justify-content-center text-center">
                <h4><FaSearch /></h4>
                <h5>Challenge not found</h5>
                <div><Link to="/Challenge">Go back</Link></div>
            </div>
        );
    }

    return (
        <>
            <ChallengeCodeEditor challenge={challenge} language={selectedLanguage} onExit={closeCodeEditorModal} />
            <Container className="py-4">
                <div className="wb-challenge-breadcrumb d-flex align-items-center gap-2 mb-3">
                    <Link to="/Challenge">Challenges</Link>
                    <FaChevronRight size={10} className="text-muted opacity-50" />
                    <span className="text-dark fw-medium">{truncate(challenge.title, 40)}</span>
                </div>

                <div className="wb-challenge-hero d-md-flex justify-content-between align-items-center">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <Badge 
                                className={`wb-difficulty-badge ${
                                    challenge.difficulty === "easy" ? "bg-success" : 
                                    challenge.difficulty === "medium" ? "bg-warning text-dark" : "bg-danger"
                                }`}
                            >
                                {challenge.difficulty}
                            </Badge>
                            <div className="wb-xp-badge">
                                <FaTrophy size={14} />
                                {challenge.xp} XP
                            </div>
                        </div>
                        <h2 className="fs-3 fw-bold mb-0 text-dark">{challenge.title}</h2>
                    </div>
                    <div className="mt-4 mt-md-0 d-flex gap-2">
                        {userInfo?.roles.some(x => ["Admin", "Creator"].includes(x)) && (
                            <Button 
                                variant="light" 
                                size="sm"
                                className="border d-flex align-items-center gap-2 px-2 fw-semibold"
                                onClick={() => navigate(`/Challenge/Edit/${challenge.id}`)}
                            >
                                <FaPen size={10} /> Edit Challenge
                            </Button>
                        )}
                    </div>
                </div>

                <div className="row g-4">
                    <div className="col-lg-8">
                        <div className="wb-challenge-tabs">
                            <div 
                                className={`wb-challenge-tab-item ${activeTab === "description" ? "active" : ""}`}
                                onClick={() => setActiveTab("description")}
                            >
                                Description
                            </div>
                            <div 
                                className={`wb-challenge-tab-item ${activeTab === "solution" ? "active" : ""}`}
                                onClick={() => setActiveTab("solution")}
                            >
                                Solution
                            </div>
                        </div>

                        <div className="wb-challenge-content-area min-vh-50">
                            {activeTab === "description" && (
                                <div className="bg-white rounded-3 border p-4 p-md-5 shadow-sm mb-4">
                                    <MarkdownRenderer content={challenge.description} allowedUrls={allowedUrls} />
                                </div>
                            )}

                            {activeTab === "solution" && (
                                <div className="wb-tab-pane">
                                    {challenge.solution ? (
                                        <div className="bg-white rounded-3 border p-4 p-md-5 shadow-sm mb-4 animate__animated animate__fadeIn">
                                            <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
                                                <FaLightbulb size={24} className="wb-icon-amber" />
                                                <h3 className="mb-0 fw-bold">Official Solution</h3>
                                            </div>
                                            <MarkdownRenderer content={challenge.solution} allowedUrls={allowedUrls} />
                                        </div>
                                    ) : challenge.solution === null ? (
                                        <div className="bg-white rounded-3 border p-5 shadow-sm text-center">
                                            <div className="mb-4 opacity-25"><FaLock size={64} className="text-muted" /></div>
                                            <h3 className="fw-bold mb-3">Solution Locked</h3>
                                            <p className="text-muted mx-auto mb-4" style={{ maxWidth: "420px" }}>
                                                Unlocking this solution will disqualify you from earning XP for this challenge. 
                                                Are you sure you want to see the answer?
                                            </p>
                                            <Button variant="primary" size="lg" className="px-5" onClick={() => setShowUnlockModal(true)}>
                                                Unlock Now
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-3 border p-5 shadow-sm text-center">
                                            <div className="mb-4 opacity-25"><FaLightbulb size={64} className="text-muted" /></div>
                                            <h3 className="fw-bold mb-3">No Solution Available</h3>
                                            <p className="text-muted mx-auto" style={{ maxWidth: "420px" }}>
                                                Official solutions for this challenge haven't been provided yet. 
                                                Check the Discussion tab for community insights!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="wb-stat-card">
                            <h6 className="fw-bold text-uppercase small text-muted mb-3">Challenge Stats</h6>
                            <div className="wb-sidebar-stat-item">
                                <div className="wb-sidebar-stat-label">Difficulty</div>
                                <div className="wb-sidebar-stat-value text-capitalize">{challenge.difficulty}</div>
                            </div>
                                <div className="wb-sidebar-stat-item">
                                    <span className="wb-sidebar-stat-label">Points</span>
                                    <span className="wb-sidebar-stat-value text-primary">{challenge.xp} XP</span>
                                </div>
                                <div className="wb-sidebar-stat-item">
                                    <span className="wb-sidebar-stat-label">Submissions</span>
                                    <span className="wb-sidebar-stat-value">{challenge.totalSubmissions || 0}</span>
                                </div>
                            <div className="wb-sidebar-stat-item">
                                <div className="wb-sidebar-stat-label">Languages</div>
                                <div className="wb-sidebar-stat-value">
                                    <LanguageIcons challenge={challenge} />
                                </div>
                            </div>
                        </div>

                        <div className="wb-solve-card">
                            <div className="d-flex align-items-center gap-2 mb-4">
                                <div className="bg-primary bg-opacity-10 p-2 rounded-3 text-primary">
                                    <FaCode size={20} />
                                </div>
                                <h5 className="mb-0 fw-bold">Ready to solve?</h5>
                            </div>
                            
                            <FormSelect
                                className="mb-3"
                                value={languageChoice}
                                onChange={(e) => setLanguageChoice(e.target.value)}
                            >
                                <option value="">Choose your language...</option>
                                {Object.entries(languagesInfo).filter(([key]) => key !== "web").map(([key, info]) => (
                                    <option key={key} value={key}>
                                        {info.displayName}
                                    </option>
                                ))}
                            </FormSelect>
                            
                            <Button
                                className="w-100 d-flex align-items-center justify-content-center gap-2"
                                variant="primary"
                                disabled={!languageChoice}
                                onClick={() => handleLanguageSelect(languageChoice as CompilerLanguagesEnum)}
                            >
                                <FaCheckCircle /> Start Coding
                            </Button>
                            
                        </div>
                    </div>
                </div>
            </Container>

            <Modal show={showUnlockModal} onHide={() => setShowUnlockModal(false)} centered className="wb-premium-modal">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                        <FaExclamationTriangle className="text-warning" />
                        Unlock Solution?
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="py-4">
                    <p className="text-muted mb-0">
                        Unlocking the official solution will disqualify you from earning **{challenge.xp} XP** for this problem.
                    </p>
                    <p className="text-muted mt-2 small italic text-center text-danger fw-semibold">
                        This action cannot be undone.
                    </p>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="light" onClick={() => setShowUnlockModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleConfirmUnlock}>Unlock Solution</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default ChallengeDetailsPage;
