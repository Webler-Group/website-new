import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import { FaPen, FaSearch, FaCode, FaChevronRight, FaPlay } from "react-icons/fa";
import { compilerLanguages, languagesInfo } from "../../../data/compilerLanguages";
import { truncate } from "../../../utils/StringUtils";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import Loader from "../../../components/Loader";
import { useAuth } from "../../auth/context/authContext";
import { Button, Container, Card, Badge } from "react-bootstrap";
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

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case "easy":
                return { bg: "success", text: "text-success" };
            case "medium":
                return { bg: "warning", text: "text-warning" };
            case "hard":
                return { bg: "danger", text: "text-danger" };
            default:
                return { bg: "secondary", text: "text-secondary" };
        }
    };

    return (
        challenge != null ?
            <>
                <ChallengeCodeEditor challenge={challenge} language={selectedLanguage} onExit={closeCodeEditorModal} />
                <Container className="py-4" style={{ maxWidth: "1200px" }}>
                    {/* Breadcrumb */}
                    <nav className="d-flex align-items-center gap-2 mb-4 text-muted" style={{ fontSize: "0.9rem" }}>
                        <Link to="/Challenge" className="text-decoration-none text-primary d-flex align-items-center gap-1 hover-opacity">
                            <FaCode size={14} />
                            <span>Challenges</span>
                        </Link>
                        <FaChevronRight size={10} />
                        <span className="text-muted">{truncate(challenge.title, 40)}</span>
                    </nav>

                    {/* Header Section */}
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Body className="p-4">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        <h2 className="mb-0">{challenge.title}</h2>
                                        {userInfo?.roles.some(x => ["Admin", "Creator"].includes(x)) && (
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                onClick={() => navigate(`/Challenge/Edit/${challenge.id}`)}
                                                className="d-flex align-items-center gap-2"
                                            >
                                                <FaPen size={12} />
                                                <span className="d-none d-sm-inline">Edit</span>
                                            </Button>
                                        )}
                                    </div>
                                    <Badge 
                                        bg={getDifficultyColor(challenge.difficulty).bg}
                                        className="px-3 py-2"
                                        style={{ fontSize: "0.85rem", fontWeight: "500" }}
                                    >
                                        {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
                                    </Badge>
                                </div>
                            </div>

                            {/* Language Icons */}
                            <div className="mt-3 pt-3 border-top">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <span className="text-muted" style={{ fontSize: "0.9rem", fontWeight: "500" }}>
                                        Supported Languages:
                                    </span>
                                </div>
                                <LanguageIcons challenge={challenge} />
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Description Section */}
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Body className="p-4">
                            <h5 className="mb-3 pb-2 border-bottom">Description</h5>
                            <div className="challenge-description">
                                <MarkdownRenderer content={challenge.description} />
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Language Selection Section */}
                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-4">
                            <h5 className="mb-3">Start Solving</h5>
                            <p className="text-muted mb-4">Choose your preferred programming language to begin:</p>
                            <div className="row g-3">
                                {Object.entries(languagesInfo)
                                    .filter(([key]) => key !== "web")
                                    .map(([key, info]) => (
                                    <div key={key} className="col-md-6 col-lg-4">
                                        <Card 
                                        className="h-100 border hover-shadow transition-all"
                                        style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                                        onClick={() => handleLanguageSelect(key as compilerLanguages)}
                                        >
                                        <Card.Body className="d-flex align-items-center justify-content-between p-3">
                                            <div className="d-flex align-items-center gap-3">
                                            <div 
                                                className="d-flex align-items-center justify-content-center rounded"
                                                style={{ 
                                                width: "40px", 
                                                height: "40px",
                                                backgroundColor: "#f8f9fa",
                                                overflow: "hidden"
                                                }}
                                            >
                                                <img
                                                src={info.logo}
                                                alt={info.displayName}
                                                style={{
                                                    width: "60%", 
                                                    height: "60%",
                                                    objectFit: "contain"
                                                }}
                                                />
                                            </div>
                                            <div>
                                                <div className="fw-semibold">{info.displayName}</div>
                                                <small className="text-muted">{key}</small>
                                            </div>
                                            </div>
                                            <Button 
                                            variant="primary" 
                                            size="sm"
                                            className="d-flex align-items-center gap-2"
                                            >
                                            <FaPlay size={12} />
                                            <span>Solve</span>
                                            </Button>
                                        </Card.Body>
                                        </Card>
                                    </div>
                                    ))}
                            </div>
                        </Card.Body>
                    </Card>
                </Container>

                <style>{`
                    .hover-opacity {
                        transition: opacity 0.2s ease;
                    }
                    .hover-opacity:hover {
                        opacity: 0.7;
                    }
                    .hover-shadow {
                        transition: box-shadow 0.2s ease;
                    }
                    .hover-shadow:hover {
                        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
                        transform: translateY(-2px);
                    }
                    .transition-all {
                        transition: all 0.2s ease;
                    }
                    .challenge-description {
                        line-height: 1.7;
                    }
                    .challenge-description pre {
                        background-color: #f8f9fa;
                        border-radius: 8px;
                        padding: 1rem;
                        margin: 1rem 0;
                    }
                    .challenge-description code {
                        background-color: #f8f9fa;
                        padding: 0.2rem 0.4rem;
                        border-radius: 4px;
                        font-size: 0.9em;
                    }
                `}</style>
            </>
            :
            loading ?
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
                    <Loader />
                </div>
                :
                <Container className="d-flex flex-column align-items-center justify-content-center text-center" style={{ minHeight: "60vh" }}>
                    <div 
                        className="d-flex align-items-center justify-content-center rounded-circle bg-light mb-4"
                        style={{ width: "100px", height: "100px" }}
                    >
                        <FaSearch size={40} className="text-muted" />
                    </div>
                    <h3 className="mb-2">Challenge Not Found</h3>
                    <p className="text-muted mb-4">
                        The challenge you're looking for doesn't exist or has been removed.
                    </p>
                    <Link to="/Challenge">
                        <Button variant="primary" className="d-flex align-items-center gap-2">
                            <FaCode />
                            Browse All Challenges
                        </Button>
                    </Link>
                </Container>
    );
};

export default ChallengeDetailsPage;