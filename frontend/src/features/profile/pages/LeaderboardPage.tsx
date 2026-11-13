import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FaTrophy } from "react-icons/fa";
import { Alert, Card, Container, Nav } from "../../../components/ui";
import Loader from "../../../components/Loader";
import PageTitle from "../../../layouts/PageTitle";
import { useApi } from "../../../context/apiCommunication";
import { useAuth } from "../../auth/context/authContext";
import useLeaderboard from "../hooks/useLeaderboard";
import LeaderboardRow from "../components/LeaderboardRow";
import { isLeaderboardPeriod, LEADERBOARD_PERIODS, LeaderboardEntry, LeaderboardPeriod, LeaderboardRankData } from "../types";
import "../profile.css";

const COUNT_PER_PAGE = 20;

const PERIOD_DESCRIPTIONS: Record<LeaderboardPeriod, string> = {
    overall: "Total XP of all time",
    monthly: "XP gained this month (UTC)",
    daily: "XP gained today (UTC)",
};

const LeaderboardPage = () => {
    const { sendJsonRequest } = useApi();
    const [searchParams, setSearchParams] = useSearchParams();
    const periodParam = searchParams.get("period");
    const period: LeaderboardPeriod = isLeaderboardPeriod(periodParam) ? periodParam : "overall";
    const { userInfo } = useAuth();
    // Highlight the given user, or the logged in user when none is given
    const userId = searchParams.get("userId") ?? userInfo?.id ?? null;

    PageTitle("Leaderboard");

    const { isLoading, error, entries, hasNextPage, loadNextPage } = useLeaderboard(period, COUNT_PER_PAGE);

    // Entry of the highlighted user, shown below the list until the user's row is loaded
    const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
    useEffect(() => {
        setUserEntry(null);
        if (!userId) return;
        let cancelled = false;
        sendJsonRequest<LeaderboardRankData>("/Profile/GetLeaderboardRank", "POST", { period, userId })
            .then(result => {
                if (!cancelled && result.data) setUserEntry(result.data.entry);
            });
        return () => { cancelled = true; };
    }, [period, userId]);

    const selectPeriod = (key: LeaderboardPeriod) => {
        if (key === period) return;
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set("period", key);
            return next;
        }, { replace: true });
    };

    const intObserver = useRef<IntersectionObserver | null>(null);
    const lastRowRef = useCallback((row: HTMLDivElement | null) => {
        if (isLoading) return;
        intObserver.current?.disconnect();
        intObserver.current = new IntersectionObserver(rows => {
            if (rows[0].isIntersecting && hasNextPage) loadNextPage();
        });
        if (row) intObserver.current.observe(row);
    }, [isLoading, hasNextPage, loadNextPage]);

    useEffect(() => () => intObserver.current?.disconnect(), []);

    const userInList = !!userId && entries.some(e => e.user.id === userId);
    const showUserEntry = !!userEntry && !userInList && !(isLoading && entries.length === 0);

    return (
        <div className="wb-profile-container">
            <Container className="py-3 px-2">
                <Card className="wb-profile-section border">
                    <div className="wb-profile-section-header flex-wrap gap-2">
                        <div className="d-flex flex-column">
                            <span className="wb-profile-section-title">
                                <FaTrophy className="wb-profile-header-xp-icon me-2" /> Leaderboard
                            </span>
                            <span className="small text-muted">{PERIOD_DESCRIPTIONS[period]}</span>
                        </div>
                        <Nav variant="pills" className="gap-2">
                            {LEADERBOARD_PERIODS.map(p => (
                                <Nav.Item key={p.key} className="small">
                                    <Nav.Link
                                        className="border border-primary py-1 px-2"
                                        active={p.key === period}
                                        onClick={() => selectPeriod(p.key)}
                                    >
                                        {p.label}
                                    </Nav.Link>
                                </Nav.Item>
                            ))}
                        </Nav>
                    </div>

                    <div>
                        {error ? (
                            <Alert variant="danger" className="m-3">{error}</Alert>
                        ) : (
                            entries.map((entry, i) => (
                                <LeaderboardRow
                                    key={entry.user.id}
                                    ref={i === entries.length - 1 ? lastRowRef : undefined}
                                    entry={entry}
                                    period={period}
                                    highlighted={entry.user.id === userId}
                                />
                            ))
                        )}

                        {isLoading && <Loader />}

                        {!isLoading && !error && entries.length === 0 && (
                            <div className="wb-profile-section-empty">
                                <p>No XP gained {period === "daily" ? "today" : period === "monthly" ? "this month" : ""} yet</p>
                            </div>
                        )}
                    </div>

                    {showUserEntry && (
                        <div className="wb-leaderboard-user-entry">
                            {userEntry.rank === null && (
                                <div className="small text-muted px-3 pt-2">
                                    Not ranked {period === "daily" ? "today" : period === "monthly" ? "this month" : "yet"}
                                </div>
                            )}
                            <LeaderboardRow entry={userEntry} period={period} highlighted />
                        </div>
                    )}
                </Card>
            </Container>
        </div>
    );
};

export default LeaderboardPage;
