import { Badge, Button, Container, cx, FormSelect, Modal } from "../../../components/ui";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import { FaPen, FaTrash, FaSearch, FaChevronLeft, FaChevronRight, FaTrophy, FaCheckCircle, FaExclamationTriangle, FaLock, FaLightbulb, FaCode, FaListUl, FaStopwatch, FaMemory, FaPlay } from "react-icons/fa";
import { languagesInfo } from "../../../data/compilerLanguages";
import { truncate } from "../../../utils/StringUtils";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import Loader from "../../../components/Loader";
import { useAuth } from "../../auth/context/authContext";
import ChallengeCodeEditor from "../components/ChallengeCodeEditor";
import LanguageIcons from "../components/LanguageIcons";
import ChallengeTags from "../components/ChallengeTags";
import ChallengeCollectionNavigator from "../components/ChallengeCollectionNavigator";
import CompilerLanguagesEnum from "../../../data/CompilerLanguagesEnum";
import { ChallengeCollectionDetails, ChallengeCollectionItem, ChallengeDetails, GetChallengeCollectionData, GetChallengeData } from "../types";

const NAVIGATOR_KEY = "wb-challenges-navigator-hidden";

const readNavigatorHidden = () => {
    try {
        return localStorage.getItem(NAVIGATOR_KEY) === "1";
    } catch {
        return false;
    }
};

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
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [searchParams] = useSearchParams();
    const collectionId = searchParams.get("collection");
    const [collection, setCollection] = useState<{ id: string; title: string; items: ChallengeCollectionItem[]; details: ChallengeCollectionDetails } | null>(null);
    const [navigatorHidden, setNavigatorHidden] = useState(readNavigatorHidden);

    const changeNavigatorHidden = (hidden: boolean) => {
        setNavigatorHidden(hidden);
        try {
            localStorage.setItem(NAVIGATOR_KEY, hidden ? "1" : "0");
        } catch {
            // storage unavailable: keep the default
        }
    };

    useEffect(() => {
        setActiveTab("description");
        setSelectedLanguage(null);
        getChallenge();
    }, [challengeId]);

    useEffect(() => {
        getCollection();
    }, [collectionId]);

    const getCollection = async () => {
        if (!collectionId) {
            setCollection(null);
            return;
        }
        const result = await sendJsonRequest<GetChallengeCollectionData>("/Challenge/GetCollection", "POST", { collectionId });
        const data = result.data?.collection;
        if (!data) {
            setCollection(null);
            return;
        }
        // A challenge listed in several sections is visited once, at its first place
        const seen = new Set<string>();
        const items = data.sections.flatMap(s => s.challenges).filter(c => !seen.has(c.id) && seen.add(c.id));
        setCollection({ id: data.id, title: data.title, items, details: data });
    };

    // `background` refreshes without the loader, e.g. after the code editor closes
    const getChallenge = async (background = false) => {
        if (!challengeId) return;
        if (!background) setLoading(true);
        const result = await sendJsonRequest<GetChallengeData>("/Challenge/GetChallenge", "POST", {
            challengeId,
        });
        if (result.data) {
            setChallenge(result.data.challenge);
        }
        if (!background) setLoading(false);
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

    const handleDelete = async () => {
        const result = await sendJsonRequest("/Challenge/Delete", "POST", { challengeId });
        setShowDeleteModal(false);
        if (result.success) {
            navigate(collectionId ? `/Challenge/Collection/${collectionId}` : "/Challenge");
        }
    };

    const closeCodeEditorModal = () => {
        setSelectedLanguage(null);
        getCollection(); // refresh the solved marks in the problem list
        getChallenge(true); // refresh the solved languages and the last attempt
    }

    const handleLanguageSelect = (key: CompilerLanguagesEnum) => {
        setSelectedLanguage(key);
    }

    // Same outer structure in every state, so the problem list stays mounted between challenges
    const showNavigator = !!collection && !navigatorHidden && !!challengeId && collection.items.some(c => c.id === challengeId);
    const layout = (main: React.ReactNode, before: React.ReactNode = null, after: React.ReactNode = null) => (
        <>
            {before}
            <Container className="py-4">
                <div className={cx(showNavigator && "wb-challenges-detail-layout")}>
                    {showNavigator && (
                        <ChallengeCollectionNavigator
                            collection={collection!.details}
                            currentId={challengeId!}
                            onHide={() => changeNavigatorHidden(true)}
                        />
                    )}
                    <div className="wb-challenges-detail-main">{main}</div>
                </div>
            </Container>
            {after}
        </>
    );

    if (loading) {
        return layout(
            <div className="d-flex justify-content-center align-items-center py-5">
                <Loader />
            </div>
        );
    }

    if (!challenge) {
        return layout(
            <div className="d-flex h-100 py-5 flex-column align-items-center justify-content-center text-center">
                <h4><FaSearch /></h4>
                <h5>Challenge not found</h5>
                <div><Link to="/Challenge">Go back</Link></div>
            </div>
        );
    }

    const position = collection ? collection.items.findIndex(c => c.id === challenge.id) : -1;
    const previous = position > 0 ? collection!.items[position - 1] : null;
    const next = position >= 0 && position < collection!.items.length - 1 ? collection!.items[position + 1] : null;
    const collectionNav = position >= 0 && (
        <div className="wb-challenges-collection-nav">
            <Button
                variant="subtle"
                size="sm"
                className="border d-flex align-items-center gap-2"
                disabled={!previous}
                onClick={() => previous && navigate(`/Challenge/${previous.id}?collection=${collection!.id}`)}
            >
                <FaChevronLeft size={10} /> {previous ? previous.title : "Previous"}
            </Button>
            <span className="small text-muted text-nowrap d-flex align-items-center gap-2">
                {navigatorHidden && (
                    <Button
                        variant="subtle"
                        size="sm"
                        className="wb-challenges-navigator-show border d-none d-xl-inline-flex align-items-center gap-2"
                        onClick={() => changeNavigatorHidden(false)}
                        title="Show the problem list"
                    >
                        <FaListUl size={11} /> Problems
                    </Button>
                )}
                {position + 1} / {collection!.items.length}
            </span>
            <Button
                variant="subtle"
                size="sm"
                className="border d-flex align-items-center gap-2"
                disabled={!next}
                onClick={() => next && navigate(`/Challenge/${next.id}?collection=${collection!.id}`)}
            >
                {next ? next.title : "Next"} <FaChevronRight size={10} />
            </Button>
        </div>
    );

    const beforeContent = (
        <>
            <ChallengeCodeEditor challenge={challenge} language={selectedLanguage} onExit={closeCodeEditorModal} />
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fs-5">Delete challenge?</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    "{challenge.title}" will be deleted for good, together with all its submissions and saved code. It is
                    also removed from any collection that lists it.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="subtle" className="border" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete}>Delete</Button>
                </Modal.Footer>
            </Modal>
        </>
    );

    const mainContent = (
        <>
                <div className="wb-challenges-breadcrumb d-flex align-items-center gap-2 mb-3">
                    <Link to="/Challenge">Challenges</Link>
                    <FaChevronRight size={10} className="text-muted opacity-50" />
                    {collection && (
                        <>
                            <Link to={`/Challenge/Collection/${collection.id}`}>{truncate(collection.title, 40)}</Link>
                            <FaChevronRight size={10} className="text-muted opacity-50" />
                        </>
                    )}
                    <span className="text-body-emphasis fw-medium">{truncate(challenge.title, 40)}</span>
                </div>

                {collectionNav}

                <div className="wb-challenges-hero d-md-flex justify-content-between align-items-center">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <Badge 
                                className={`wb-challenges-difficulty-badge ${
                                    challenge.difficulty === "easy" ? "bg-success" : 
                                    challenge.difficulty === "medium" ? "bg-warning text-dark" : "bg-danger"
                                }`}
                            >
                                {challenge.difficulty}
                            </Badge>
                            <div className="wb-challenges-xp-badge">
                                <FaTrophy size={14} />
                                {challenge.xp} XP
                            </div>
                            {challenge.timeLimit ? (
                                <span className="wb-challenges-limit small text-muted" title="CPU time limit per test">
                                    <FaStopwatch size={12} />
                                    {challenge.timeLimit < 1000 ? `${challenge.timeLimit} ms` : `${challenge.timeLimit / 1000} s`}
                                </span>
                            ) : null}
                            {challenge.memoryLimit ? (
                                <span className="wb-challenges-limit small text-muted" title="Memory limit per test">
                                    <FaMemory size={12} />
                                    {challenge.memoryLimit} MB
                                </span>
                            ) : null}
                        </div>
                        <h2 className="fs-3 fw-bold mb-0 text-body-emphasis">{challenge.title}</h2>
                        <ChallengeTags tags={challenge.tags} className="mt-2" />
                    </div>
                    <div className="mt-4 mt-md-0 d-flex gap-2">
                        {userInfo?.roles.some(x => ["Admin", "Creator"].includes(x)) && (
                            <Button 
                                variant="subtle" 
                                size="sm"
                                className="border d-flex align-items-center gap-2 px-2 fw-semibold"
                                onClick={() => navigate(`/Challenge/Edit/${challenge.id}`)}
                            >
                                <FaPen size={10} /> Edit Challenge
                            </Button>
                        )}
                        {userInfo?.roles.some(x => ["Admin", "Creator"].includes(x)) && (
                            <Button
                                variant="outline-danger"
                                size="sm"
                                className="d-flex align-items-center gap-2 px-2 fw-semibold"
                                onClick={() => setShowDeleteModal(true)}
                            >
                                <FaTrash size={10} /> Delete
                            </Button>
                        )}
                    </div>
                </div>

                <div className={cx("row g-4", showNavigator && "wb-challenges-body--with-nav")}>
                    <div className="col-lg-8">
                        {challenge.lastAttemptLanguage && languagesInfo[challenge.lastAttemptLanguage] && (
                            <Button
                                variant="primary"
                                size="sm"
                                className="d-inline-flex align-items-center gap-2 mb-3 fw-semibold"
                                onClick={() => handleLanguageSelect(challenge.lastAttemptLanguage!)}
                            >
                                <FaPlay size={10} /> Continue solving in {languagesInfo[challenge.lastAttemptLanguage].displayName}
                            </Button>
                        )}
                        <div className="wb-challenges-tabs">
                            <div 
                                className={cx("wb-challenges-tab-item", activeTab === "description" && "wb-challenges-tab-item--active")}
                                onClick={() => setActiveTab("description")}
                            >
                                Description
                            </div>
                            <div 
                                className={cx("wb-challenges-tab-item", activeTab === "solution" && "wb-challenges-tab-item--active")}
                                onClick={() => setActiveTab("solution")}
                            >
                                Solution
                            </div>
                        </div>

                        <div className="wb-challenges-content-area min-vh-50">
                            {activeTab === "description" && (
                                <div className="bg-body rounded-3 border p-4 p-md-5 shadow-sm mb-4">
                                    <MarkdownRenderer content={challenge.description} />
                                </div>
                            )}

                            {activeTab === "solution" && (
                                <div>
                                    {challenge.solution ? (
                                        <div className="bg-body rounded-3 border p-4 p-md-5 shadow-sm mb-4 animate__animated animate__fadeIn">
                                            <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
                                                <FaLightbulb size={24} className="wb-challenges-icon-amber" />
                                                <h3 className="mb-0 fw-bold">Official Solution</h3>
                                            </div>
                                            <MarkdownRenderer content={challenge.solution} />
                                        </div>
                                    ) : challenge.solution === null ? (
                                        <div className="bg-body rounded-3 border p-5 shadow-sm text-center">
                                            <div className="mb-4 opacity-25"><FaLock size={64} className="text-muted" /></div>
                                            <h3 className="fw-bold mb-3">Solution Locked</h3>
                                            <p className="wb-challenges-solution-message text-muted mx-auto mb-4">
                                                Unlocking this solution will disqualify you from earning XP for this challenge. 
                                                Are you sure you want to see the answer?
                                            </p>
                                            <Button variant="primary" size="lg" className="px-5" onClick={() => setShowUnlockModal(true)}>
                                                Unlock Now
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="bg-body rounded-3 border p-5 shadow-sm text-center">
                                            <div className="mb-4 opacity-25"><FaLightbulb size={64} className="text-muted" /></div>
                                            <h3 className="fw-bold mb-3">No Solution Available</h3>
                                            <p className="wb-challenges-solution-message text-muted mx-auto">
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
                        <div className="wb-challenges-stat-card">
                            <h6 className="fw-bold text-uppercase small text-muted mb-3">Challenge Stats</h6>
                            <div className="wb-challenges-sidebar-stat-item">
                                <div className="wb-challenges-sidebar-stat-label">Difficulty</div>
                                <div className="wb-challenges-sidebar-stat-value text-capitalize">{challenge.difficulty}</div>
                            </div>
                                <div className="wb-challenges-sidebar-stat-item">
                                    <span className="wb-challenges-sidebar-stat-label">Points</span>
                                    <span className="wb-challenges-sidebar-stat-value text-primary">{challenge.xp} XP</span>
                                </div>
                                <div className="wb-challenges-sidebar-stat-item">
                                    <span className="wb-challenges-sidebar-stat-label">Submissions</span>
                                    <span className="wb-challenges-sidebar-stat-value">{challenge.totalSubmissions || 0}</span>
                                </div>
                            <div className="wb-challenges-sidebar-stat-item">
                                <div className="wb-challenges-sidebar-stat-label">Languages</div>
                                <div className="wb-challenges-sidebar-stat-value">
                                    <LanguageIcons challenge={challenge} />
                                </div>
                            </div>
                        </div>

                        <div className="wb-challenges-solve-card">
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
                                        {challenge.templates?.some(t => t.name === key) ? " (starter code)" : ""}
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
        </>
    );

    return layout(mainContent, beforeContent, (
            <Modal show={showUnlockModal} onHide={() => setShowUnlockModal(false)} centered>
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
                    <Button variant="subtle" className="border" onClick={() => setShowUnlockModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleConfirmUnlock}>Unlock Solution</Button>
                </Modal.Footer>
            </Modal>
    ));
};

export default ChallengeDetailsPage;
