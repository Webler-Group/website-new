import { Container, Button, Modal } from "react-bootstrap";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FaArrowLeft, FaLightbulb, FaChevronRight, FaExclamationTriangle, FaLock } from "react-icons/fa";
import PageTitle from "../../../layouts/PageTitle";
import { useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { ChallengeDetails, GetChallengeData } from "../types";
import Loader from "../../../components/Loader";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import { truncate } from "../../../utils/StringUtils";

const allowedUrls = [
    /^https?:\/\/.+/i,
    /^\/.*/ 
];

const ChallengeSolutionPage = () => {
    const { challengeId } = useParams<{ challengeId: string }>();
    const navigate = useNavigate();
    const { sendJsonRequest } = useApi();
    const [challenge, setChallenge] = useState<ChallengeDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);

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

    PageTitle("Challenge Solution");

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

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center py-5">
                <Loader />
            </div>
        );
    }

    return (
        <Container className="py-4">
            <div className="wb-challenge-breadcrumb d-flex align-items-center gap-2 mb-4">
                <Link to="/Challenge">Challenges</Link>
                <FaChevronRight size={10} className="text-muted opacity-50" />
                <Link to={`/Challenge/${challengeId}`}>{challenge ? truncate(challenge.title, 30) : "Challenge"}</Link>
                <FaChevronRight size={10} className="text-muted opacity-50" />
                <span className="text-dark fw-medium">Solution</span>
            </div>

            <div className="mb-4">
                <Button 
                    variant="link" 
                    className="p-0 text-decoration-none d-flex align-items-center gap-2 text-muted"
                    onClick={() => navigate(`/Challenge/${challengeId}`)}
                >
                    <FaArrowLeft size={12} /> Back to Challenge
                </Button>
            </div>

            {challenge?.solution ? (
                <div className="wb-solution-content bg-white border rounded-3 shadow-sm p-4 p-md-5">
                    <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
                        <FaLightbulb size={24} className="wb-icon-amber" />
                        <h2 className="mb-0 fw-bold">Official Solution</h2>
                    </div>
                    <MarkdownRenderer content={challenge.solution} allowedUrls={allowedUrls} />
                </div>
            ) : challenge?.solution === null ? (
                <div className="wb-solution-container text-center py-5 bg-white border rounded-3 shadow-sm">
                    <div className="mb-4 opacity-25">
                        <FaLock size={64} className="text-muted" />
                    </div>
                    <h3 className="fw-bold text-dark mb-2">Solution Locked</h3>
                    <p className="text-muted mx-auto mb-4" style={{ maxWidth: "400px" }}>
                        Unlock this solution to see the implementation details. 
                        Note that unlocking will <span className="text-danger fw-bold">prevent you from earning XP</span> for this challenge.
                    </p>
                    <div className="mt-4">
                        <Button variant="primary" onClick={() => setShowUnlockModal(true)}>
                            Unlock Solution
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="wb-solution-container text-center py-5 bg-white border rounded-3 shadow-sm">
                    <div className="mb-4 opacity-25">
                        <FaLightbulb size={64} className="text-muted" />
                    </div>
                    <h3 className="fw-bold text-dark mb-2">No Solution Yet</h3>
                    <p className="text-muted mx-auto" style={{ maxWidth: "400px" }}>
                        Official solutions for this challenge are not yet available. 
                        Check back soon or check the discussion tab for community solutions!
                    </p>
                    <div className="mt-4">
                        <Button variant="primary" onClick={() => navigate(`/Challenge/${challengeId}`)}>
                            Go Master This!
                        </Button>
                    </div>
                </div>
            )}

            <Modal show={showUnlockModal} onHide={() => setShowUnlockModal(false)} centered className="wb-premium-modal">
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                        <FaExclamationTriangle className="text-warning" />
                        Unlock Solution?
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="py-4">
                    <p className="text-muted mb-0">
                        Viewing the official solution before solving the challenge will 
                        <span className="text-danger fw-bold"> disqualify you from earning any XP</span> for this problem.
                    </p>
                    <p className="text-muted mt-2 small italic text-center">
                        Are you sure you want to proceed?
                    </p>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="light" onClick={() => setShowUnlockModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleConfirmUnlock}>
                        Unlock Solution
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ChallengeSolutionPage;
