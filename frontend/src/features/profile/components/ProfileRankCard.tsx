import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaChevronRight, FaTrophy } from "react-icons/fa";
import { Card } from "../../../components/ui";
import { useApi } from "../../../context/apiCommunication";
import { LeaderboardEntry, LeaderboardRankData } from "../types";

interface ProfileRankCardProps {
    userId: string;
}

/** Monthly leaderboard rank of a user, opens the leaderboard with the user highlighted */
const ProfileRankCard = ({ userId }: ProfileRankCardProps) => {
    const { sendJsonRequest } = useApi();
    const [entry, setEntry] = useState<LeaderboardEntry | null>(null);

    useEffect(() => {
        setEntry(null);
        let cancelled = false;
        sendJsonRequest<LeaderboardRankData>("/Profile/GetLeaderboardRank", "POST", { period: "monthly", userId })
            .then(result => {
                if (!cancelled && result.data) setEntry(result.data.entry);
            });
        return () => { cancelled = true; };
    }, [userId]);

    return (
        <Card className="wb-profile-section border mb-3">
            <Link
                to={`/Profile/Leaderboard?period=monthly&userId=${userId}`}
                className="wb-profile-rank-card"
            >
                <FaTrophy className="wb-profile-header-xp-icon flex-shrink-0" size={22} />
                <div className="flex-grow-1 d-flex flex-column">
                    <span className="wb-profile-section-title">Monthly Rank</span>
                    <span className="small text-muted">
                        {entry === null ? " " : entry.rank === null
                            ? "No XP gained this month yet"
                            : `+${entry.xp.toLocaleString()} XP this month`}
                    </span>
                </div>
                <span className="wb-profile-rank-card-value">
                    {entry?.rank != null ? `#${entry.rank}` : "–"}
                </span>
                <FaChevronRight className="text-muted flex-shrink-0" size={12} />
            </Link>
        </Card>
    );
};

export default ProfileRankCard;
