import { Modal, Badge } from "react-bootstrap";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSolvedChallenges from "../hooks/useSolvedChallenges";
import LanguageIcons from "../../challenges/components/LanguageIcons";
import { IChallenge } from "../../challenges/types";

interface ChallengesSectionProps {
    userId: string;
    onClose: () => void;
}

const ChallengesSection = ({ userId, onClose }: ChallengesSectionProps) => {
    const navigate = useNavigate();
    const [pageNum, setPageNum] = useState(1);

    const { isLoading, error, results, hasNextPage } = useSolvedChallenges(userId, 12, pageNum);

    const intObserver = useRef<IntersectionObserver>();

    const lastItemRef = useCallback(
        (node: any) => {
            if (isLoading) return;

            if (intObserver.current) intObserver.current.disconnect();

            intObserver.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasNextPage) {
                    setPageNum((prev) => prev + 1);
                }
            });

            if (node) intObserver.current.observe(node);
        },
        [isLoading, hasNextPage]
    );

    const renderDifficultyBadge = (difficulty: IChallenge["difficulty"]) => {
        const className =
            difficulty === "easy"
                ? "bg-success"
                : difficulty === "medium"
                    ? "bg-warning text-dark"
                    : "bg-danger";

        return <Badge className={className}>{difficulty}</Badge>;
    };

    const content = results.map((challenge, i) => {
        const isLast = results.length === i + 1;

        const card = (
            <div
                className="shadow-sm border rounded p-2 wb-challenges__item"
                onClick={() => navigate(`/Challenge/${challenge.id}`)}
                style={{ cursor: "pointer" }}
            >
                <div className="fw-semibold">
                    {challenge.title}
                </div>
                <div className="mt-1">{renderDifficultyBadge(challenge.difficulty)}</div>

                <div className="mt-2"><LanguageIcons challenge={challenge} /></div>
            </div>
        );

        return (
            <div key={challenge.id} className="mt-2" ref={isLast ? lastItemRef : undefined}>
                {card}
            </div>
        );
    });

    return (
        <Modal
            show={true}
            onHide={onClose}
            className="d-flex justify-content-center align-items-center"
            fullscreen="sm-down"
            contentClassName="wb-modal__container codes"
        >
            <Modal.Header closeButton>
                <Modal.Title>Challenges</Modal.Title>
            </Modal.Header>

            <Modal.Body className="overflow-auto">
                {error ? (
                    <p>{error}</p>
                ) : (
                    <div>
                        {content}
                        {isLoading && <div className="text-center py-3 text-secondary">Loading…</div>}
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default ChallengesSection;