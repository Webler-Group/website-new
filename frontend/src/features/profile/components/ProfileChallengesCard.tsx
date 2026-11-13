import { FaHourglassHalf, FaPuzzlePiece } from "react-icons/fa";
import { Button, Card } from "../../../components/ui";

type Difficulty = "easy" | "medium" | "hard";

interface ProfileChallengesCardProps {
    solved: Record<Difficulty, number>;
    totals: Record<Difficulty, number>;
    attempting: number;
    isCurrentUser: boolean;
    onShowSolved?: () => void;
}

const LEVELS: { key: Difficulty; label: string }[] = [
    { key: "easy", label: "Easy" },
    { key: "medium", label: "Medium" },
    { key: "hard", label: "Hard" },
];

const percentOf = (part: number, whole: number) => (whole > 0 ? Math.min(100, (part / whole) * 100) : 0);

const ProfileChallengesCard = ({ solved, totals, attempting, isCurrentUser, onShowSolved }: ProfileChallengesCardProps) => {
    const totalSolved = solved.easy + solved.medium + solved.hard;
    const totalAll = totals.easy + totals.medium + totals.hard;

    return (
        <Card className="wb-profile-section border mb-3">
            <div className="wb-profile-section-header">
                <span className="wb-profile-section-title">
                    <FaPuzzlePiece className="text-muted me-2" /> Challenges
                </span>
                {totalSolved > 0 && onShowSolved && (
                    <Button variant="link" size="sm" className="p-0" onClick={onShowSolved}>Show All</Button>
                )}
            </div>
            <div className="wb-profile-challenges">
                <div className="wb-profile-challenges-summary">
                    <span className="wb-profile-challenges-count">{totalSolved}</span>
                    <span className="wb-profile-challenges-caption">of {totalAll} solved</span>
                    <span className="wb-profile-challenges-attempting">
                        <FaHourglassHalf size={10} /> {attempting} attempting
                    </span>
                </div>
                {LEVELS.map(({ key, label }) => (
                    <div key={key} className={`wb-profile-challenges-level wb-profile-challenges--${key}`}>
                        <div className="wb-profile-challenges-level-head">
                            <span className="wb-profile-challenges-level-label">{label}</span>
                            <span className="wb-profile-challenges-level-value">
                                <strong>{solved[key]}</strong> / {totals[key]}
                            </span>
                        </div>
                        <div className="wb-profile-challenges-track">
                            <div className="wb-profile-challenges-fill" style={{ width: `${percentOf(solved[key], totals[key])}%` }} />
                        </div>
                    </div>
                ))}
            </div>
            {isCurrentUser && (
                <div className="wb-profile-section-footer">
                    <Button to="/Challenge" variant="primary" size="sm" className="w-100">
                        Solve more
                    </Button>
                </div>
            )}
        </Card>
    );
};

export default ProfileChallengesCard;
