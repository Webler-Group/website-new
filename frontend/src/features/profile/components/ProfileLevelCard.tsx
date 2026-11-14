import { FaStar } from "react-icons/fa";
import { Card, ProgressBar } from "../../../components/ui";
import { getLevelProgress } from "@shared/utils/levels";

interface ProfileLevelCardProps {
    xp: number;
}

/** Current level and the XP still needed to reach the next one */
const ProfileLevelCard = ({ xp }: ProfileLevelCardProps) => {
    const { level, current, required, remaining } = getLevelProgress(xp);

    return (
        <Card className="wb-profile-section border h-100">
            <div className="wb-profile-level-card">
                <FaStar className="wb-profile-header-xp-icon flex-shrink-0" size={22} />
                <div className="wb-profile-level-card-body flex-grow-1 d-flex flex-column gap-1">
                    <div className="d-flex justify-content-between align-items-baseline gap-2">
                        <span className="wb-profile-section-title">Level {level}</span>
                        <span className="small text-muted text-nowrap">
                            {current.toLocaleString()} / {required.toLocaleString()} XP
                        </span>
                    </div>
                    <ProgressBar now={current} max={required} className="wb-profile-level-card-bar" />
                    <span className="small text-muted">
                        <b>{remaining.toLocaleString()} XP</b> to level {level + 1}
                    </span>
                </div>
            </div>
        </Card>
    );
};

export default ProfileLevelCard;
