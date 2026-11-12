import { Ref } from "react";
import { FaStar } from "react-icons/fa6";
import { cx } from "../../../components/ui";
import Country from "../../../components/Country";
import countries from "../../../data/countries";
import ProfileAvatar from "../../../components/ProfileAvatar";
import ProfileName from "../../../components/ProfileName";
import { LeaderboardEntry, LeaderboardPeriod } from "../types";

interface LeaderboardRowProps {
    entry: LeaderboardEntry;
    period: LeaderboardPeriod;
    highlighted?: boolean;
    ref?: Ref<HTMLDivElement>;
}

const LeaderboardRow = ({ entry, period, highlighted, ref }: LeaderboardRowProps) => {
    const { rank, xp, user } = entry;
    const country = user.countryCode ? countries.find(c => c.code === user.countryCode) : undefined;

    return (
        <div ref={ref} className={cx("wb-leaderboard-row", highlighted && "wb-leaderboard-row-highlight")}>
            <div
                className={cx("wb-leaderboard-rank", rank !== null && rank <= 3 && `wb-leaderboard-rank-${rank}`)}
                title={rank === null ? "Not ranked" : `Rank ${rank}`}
            >
                {rank ?? "–"}
            </div>
            <div className="flex-shrink-0">
                <ProfileAvatar size={42} avatarUrl={user.avatarUrl} />
            </div>
            <div className="wb-leaderboard-user">
                <ProfileName userId={user.id} userName={user.name} className={cx(!user.active && "text-decoration-line-through")} />
                <div className="d-flex align-items-center flex-wrap text-muted small">
                    {country && (
                        <>
                            <Country country={country} />
                            <span className="mx-2">·</span>
                        </>
                    )}
                    <span>Lvl {user.level}</span>
                </div>
            </div>
            <div className="wb-leaderboard-xp">
                <FaStar className="wb-profile-header-xp-icon" />
                <b>{period !== "overall" && xp > 0 ? "+" : ""}{xp.toLocaleString()}</b> XP
            </div>
        </div>
    );
};

export default LeaderboardRow;
