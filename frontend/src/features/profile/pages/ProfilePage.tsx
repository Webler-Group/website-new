import { Badge, Button, Card, Container, cx, Dropdown } from "../../../components/ui";
import { useCallback, useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/context/authContext";
import ProfileSettings from "../components/ProfileSettings";
import countries from "../../../data/countries";
import { FaGear, FaHammer, FaStar } from "react-icons/fa6";
import Country from "../../../components/Country";
import FollowList from "../components/FollowList";
import CodesSection from "../components/CodesSection";
import Code from "../../codes/components/Code";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";
import ProfileAvatar from "../../../components/ProfileAvatar";
import Question from "../../discuss/components/Question";
import QuestionsSection from "../components/QuestionsSection";
import { useSeo, toExcerpt } from "../../../components/Seo";
import Loader from "../../../components/Loader";
import NotificationToast from "../../../components/NotificationToast";
import ChallengesSection from "../components/ChallengesSection";
import ProfileRankCard from "../components/ProfileRankCard";
import ProfileLevelCard from "../components/ProfileLevelCard";
import ProfileChallengesCard from "../components/ProfileChallengesCard";
import { GetProfileData, ProfileOverview, UserDetails } from "../types";
import RolesEnum from "@shared/data/RolesEnum";
import { CreateDirectMessagesData } from "../../channels/types";
import DateUtils from "../../../utils/DateUtils";
import { FaBan, FaCode, FaCommentAlt, FaNewspaper } from "react-icons/fa";
import { FaBookOpen } from "react-icons/fa6";
import "../profile.css";

const ProfilePage = () => {
    const { sendJsonRequest } = useApi();
    const { userId } = useParams();

    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const { userInfo } = useAuth();
    const [followLoading, setFollowLoading] = useState(false);
    const [followingCount, setFollowingCount] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);

    const [followListOptions, setFollowListOptions] = useState({ path: "", userId: "" });
    const [followListTitle, setFollowListTitle] = useState("");

    const [overview, setOverview] = useState<ProfileOverview | null>(null);
    const codes = overview?.codes ?? [];
    const questions = overview?.questions ?? [];
    const feedPosts = overview?.feeds ?? [];
    const courses = overview?.courses ?? [];

    const [codesSectionVisible, setCodesSectionVisible] = useState(false);

    const [questionsSectionVisible, setQuestionsSectionVisible] = useState(false);

    const [challengesSectionVisible, setChallengesSectionVisible] = useState(false);

    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const navigate = useNavigate();

    useSeo({
        title: userDetails?.name,
        description: userDetails ? (toExcerpt(userDetails.bio) ?? `${userDetails.name}'s profile on Webler Codes — codes, questions and activity.`) : undefined,
        type: userDetails ? "profile" : undefined,
        // Own profile at /Profile is a duplicate of /Profile/:userId
        path: userDetails ? `/Profile/${userDetails.id}` : undefined
    });

    useEffect(() => {
        const fetchProfile = async () => {
            setFollowListTitle("");
            const result = await sendJsonRequest<GetProfileData>(`/Profile/GetProfile`, "POST", { userId });
            if (result.data) {
                setUserDetails(result.data.userDetails);
                setFollowingCount(result.data.userDetails.following);
                setFollowersCount(result.data.userDetails.followers);
                setOverview(result.data.overview);
            } else {
                setUserDetails(null);
                setOverview(null);
            }
        };
        fetchProfile();
    }, [userId]);

    const showNotification = useCallback((type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    const onUserUpdate = (data: Partial<UserDetails>) => {
        if (userDetails) setUserDetails({ ...userDetails, ...data });
    };

    const handleFollow = async () => {
        if (!userDetails) return;
        setFollowLoading(true);
        const result = await sendJsonRequest(`/Profile/Follow`, "POST", { userId });
        if (result.success) {
            setUserDetails((ud) => (ud ? { ...ud, isFollowing: true, followers: ud.followers + 1 } : null));
            setFollowersCount((c) => c + 1);
        } else {
            showNotification("error", result.error?.[0].message ?? "Something went wrong");
        }
        setFollowLoading(false);
    };

    const handleUnfollow = async () => {
        if (!userDetails) return;
        setFollowLoading(true);
        const result = await sendJsonRequest(`/Profile/Unfollow`, "POST", { userId });
        if (result.success) {
            setUserDetails((ud) => (ud ? { ...ud, isFollowing: false, followers: ud.followers - 1 } : null));
            setFollowersCount((c) => c - 1);
        } else {
            showNotification("error", result.error?.[0].message ?? "Something went wrong");
        }
        setFollowLoading(false);
    };

    const closeFollowList = () => setFollowListTitle("");

    const showFollowers = () => {
        if (!userDetails?.id) return;
        setFollowListTitle("Followers");
        setFollowListOptions({ path: "/Profile/GetFollowers", userId: userDetails.id });
    };

    const showFollowing = () => {
        if (!userDetails?.id) return;
        setFollowListTitle("Following");
        setFollowListOptions({ path: "/Profile/GetFollowing", userId: userDetails.id });
    };

    const showCodesSection = () => setCodesSectionVisible(true);
    const closeCodesSection = () => setCodesSectionVisible(false);

    const showQuestionsSection = () => setQuestionsSectionVisible(true);
    const closeQuestionsSection = () => setQuestionsSectionVisible(false);

    const showChallengesSection = () => setChallengesSectionVisible(true);
    const closeChallengesSection = () => setChallengesSectionVisible(false);

    const handleMessage = async () => {
        const result = await sendJsonRequest<CreateDirectMessagesData>("/Channels/CreateDirectMessages", "POST", { userId });
        if (result.data) {
            navigate("/Channels/" + result.data.channel.id);
        } else {
            showNotification("error", result.error?.[0].message ?? "Something went wrong");
        }
    };

    const openSettings = () => {
        if (!userDetails) return;
        navigate("/Profile/" + userDetails.id + "?settings=true");
    };

    const blockUser = async () => {
        if (!userDetails) return;
        const result = await sendJsonRequest(`/Profile/BlockUser`, "POST", { targetId: userDetails.id });
        if (result.success) {
            setUserDetails((ud) => ud ? { ...ud, isBlocked: true } : null);
            showNotification("success", "User blocked successfully");
        } else {
            showNotification("error", result.error?.[0].message ?? "Something went wrong");
        }
    };

    const unblockUser = async () => {
        if (!userDetails) return;
        const result = await sendJsonRequest(`/Profile/UnblockUser`, "POST", { targetId: userDetails.id });
        if (result.success) {
            setUserDetails((ud) => ud ? { ...ud, isBlocked: false } : null);
            showNotification("success", "User unblocked successfully");
        } else {
            showNotification("error", result.error?.[0].message ?? "Something went wrong");
        }
    };

    const isCurrentUser = !!userInfo && userInfo.id === userId;
    const isAdmin = !!userInfo && userInfo.roles.includes(RolesEnum.ADMIN);

    const solved = overview?.challenges.solved;
    const easySolved = solved?.easy ?? 0;
    const mediumSolved = solved?.medium ?? 0;
    const hardSolved = solved?.hard ?? 0;
    const totalSolved = easySolved + mediumSolved + hardSolved;

    return (
        <div className="wb-profile-container">
            {userDetails ? (
                <>
                    <NotificationToast notification={notification} onClose={() => setNotification(null)} />

                    {codesSectionVisible && <CodesSection userId={userDetails.id} onClose={closeCodesSection} />}
                    {questionsSectionVisible && <QuestionsSection userId={userDetails.id} onClose={closeQuestionsSection} />}
                    {challengesSectionVisible && <ChallengesSection userId={userDetails.id} onClose={closeChallengesSection} />}

                    <FollowList
                        options={followListOptions}
                        visible={followListTitle !== ""}
                        title="Followers"
                        onClose={closeFollowList}
                        setCount={setFollowingCount}
                    />

                    {(isCurrentUser || isAdmin) && (
                        <ProfileSettings userDetails={userDetails} onUpdate={onUserUpdate} />
                    )}

                    <Container className="py-3 px-2">

                        {/* ── Profile Header ── */}
                        <Card className="wb-profile-header border mb-3">
                            {
                                userInfo &&
                                <div className="wb-profile-header-menu">
                                    <Dropdown drop="start">
                                        <Dropdown.Toggle as={EllipsisDropdownToggle} />
                                        <Dropdown.Menu>
                                            {(isCurrentUser || isAdmin) && (
                                                <Dropdown.Item onClick={openSettings}><FaGear /> Settings</Dropdown.Item>
                                            )}
                                            {userInfo?.roles.some(r => ["Moderator", "Admin"].includes(r)) && (
                                                <Dropdown.Item as={Link} to={`/Admin/UserSearch/${userDetails.id}`}>
                                                    <FaHammer /> Open in Mod View
                                                </Dropdown.Item>
                                            )}

                                            {!isCurrentUser && (
                                                <Dropdown.Item onClick={userDetails.isBlocked ? unblockUser : blockUser}>
                                                    <FaBan /> {userDetails.isBlocked ? "Unblock" : "Block"}
                                                </Dropdown.Item>
                                            )}

                                        </Dropdown.Menu>
                                    </Dropdown>
                                </div>
                            }

                            <div className="wb-profile-header-body">
                                {/* Avatar */}
                                <div className="wb-profile-header-avatar-wrap">
                                    <ProfileAvatar size={80} avatarUrl={userDetails.avatarUrl} />
                                    {userDetails.roles.includes(RolesEnum.MODERATOR) && (
                                        <Badge className="wb-profile-header-badge" bg="secondary">Moderator</Badge>
                                    )}
                                    {userDetails.isBlocked && (
                                        <Badge className="wb-profile-header-badge" bg="danger"><FaBan /> Blocked</Badge>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="wb-profile-header-info">
                                    <div className="wb-profile-header-name-row">
                                        <span
                                            className={cx("wb-profile-header-name", !userDetails.active && "text-decoration-line-through")}
                                        >
                                            {userDetails.name}
                                        </span>
                                        {userInfo && userDetails.id !== userInfo.id && !userDetails.isBlocked && (
                                            <div className="d-flex gap-2 flex-shrink-0">
                                                <Button
                                                    variant={userDetails.isFollowing ? "outline-secondary" : "primary"}
                                                    size="sm"
                                                    onClick={userDetails.isFollowing ? handleUnfollow : handleFollow}
                                                    disabled={followLoading}
                                                >
                                                    {userDetails.isFollowing ? "Unfollow" : "Follow"}
                                                </Button>
                                                {userDetails.roles.includes(RolesEnum.USER) && (
                                                    <Button variant="outline-primary" size="sm" onClick={handleMessage}>
                                                        Message
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {userDetails.bio && (
                                        <p className="wb-profile-header-bio">{userDetails.bio}</p>
                                    )}

                                    <div className="wb-profile-header-meta">
                                        <button className="wb-profile-follows-btn" onClick={showFollowing}>
                                            <b>{followingCount}</b> Following
                                        </button>
                                        <button className="wb-profile-follows-btn" onClick={showFollowers}>
                                            <b>{followersCount}</b> Followers
                                        </button>
                                        {userDetails.countryCode && (
                                            <span className="wb-profile-header-stat">
                                                <Country country={countries.find(c => c.code === userDetails.countryCode)!} />
                                            </span>
                                        )}
                                    </div>

                                    <div className="wb-profile-header-meta mt-2">
                                        <span className="wb-profile-header-stat">
                                            Lvl <b>{userDetails.level}</b>
                                        </span>
                                        <span className="wb-profile-header-stat">
                                            <FaStar className="wb-profile-header-xp-icon" /> <b>{userDetails.xp.toLocaleString()}</b> XP
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* ── Level Progress + Monthly Leaderboard Rank (stacked on small screens) ── */}
                        <div className="wb-profile-cards-row mb-3">
                            <ProfileLevelCard xp={userDetails.xp} />
                            <ProfileRankCard userId={userDetails.id} entry={overview?.monthlyRank ?? null} />
                        </div>

                        {/* ── Courses Row ── */}
                        {(isCurrentUser || courses.length > 0) && (
                            <Card className="wb-profile-section border-0 mb-3">
                                <div className="wb-profile-section-header border-bottom-0">
                                    <span className="wb-profile-section-title">
                                        <FaBookOpen className="text-muted me-2" /> Courses
                                    </span>
                                    {courses.length > 0 && (
                                        <Button to="/Courses" variant="link" size="sm" className="p-0">Browse</Button>
                                    )}
                                </div>
                                {courses.length > 0 ? (
                                    <div className="wb-profile-courses-scroll">
                                        {courses.map((course) => (
                                            <div
                                                key={course.id}
                                                className="wb-profile-courses-card"
                                                onClick={() => navigate("/Courses/" + course.code)}
                                            >
                                                <div className="wb-profile-courses-card-img">
                                                    <img
                                                        src={course.coverImageUrl || "/resources/images/logoicon.svg"}
                                                        alt={course.title}
                                                    />
                                                </div>
                                                <span className="wb-profile-courses-card-title">{course.title}</span>
                                                <Badge
                                                    bg={course.completed ? "success" : "info"}
                                                    text={course.completed ? undefined : "dark"}
                                                    className="wb-profile-courses-card-badge"
                                                >
                                                    {course.completed ? "Completed" : "In Progress"}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="wb-profile-section-empty">
                                        <p>No courses enrolled yet</p>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* ── Content Grid ── */}
                        <div className="wb-profile-grid">

                            {/* Left column */}
                            <div className="wb-profile-grid-col">

                                {/* Codes */}
                                {(isCurrentUser || codes.length > 0) && (
                                    <Card className="wb-profile-section border mb-3">
                                        <div className="wb-profile-section-header">
                                            <span className="wb-profile-section-title">
                                                <FaCode className="text-muted me-2" /> Codes
                                            </span>
                                            {codes.length > 0 && (
                                                <Button variant="link" size="sm" className="p-0" onClick={showCodesSection}>
                                                    Show All
                                                </Button>
                                            )}
                                        </div>
                                        <div>
                                            {codes.length > 0 ? (
                                                codes.map((code) => (
                                                    <Code key={code.id} code={code} searchQuery="" />
                                                ))
                                            ) : (
                                                <div className="wb-profile-section-empty">
                                                    <p>No codes saved yet</p>
                                                </div>
                                            )}
                                        </div>
                                        {isCurrentUser && (
                                            <div className="wb-profile-section-footer">
                                                <Button variant="primary" size="sm" className="w-100" onClick={() => navigate("/Compiler-Playground")}>
                                                    Add New
                                                </Button>
                                            </div>
                                        )}
                                    </Card>
                                )}

                                {/* Feed Posts */}
                                {(isCurrentUser || feedPosts.length > 0) && (
                                    <Card className="wb-profile-section border mb-3">
                                        <div className="wb-profile-section-header">
                                            <span className="wb-profile-section-title">
                                                <FaNewspaper className="text-muted me-2" /> Posts
                                            </span>
                                            {feedPosts.length > 0 && (
                                                <Button to="/Feed" variant="link" size="sm" className="p-0">View Feed</Button>
                                            )}
                                        </div>
                                        <div>
                                            {feedPosts.length > 0 ? (
                                                feedPosts.map((post) => (
                                                    <div
                                                        key={post.id}
                                                        className="wb-profile-feed-item border-bottom"
                                                        onClick={() => navigate("/Feed/" + post.id)}
                                                    >
                                                        <p className="wb-profile-feed-item-text">{post.message}</p>
                                                        <div className="wb-profile-feed-item-meta">
                                                            <span className="d-flex align-items-center gap-1">
                                                                <FaCommentAlt size={11} /> {post.answers}
                                                            </span>
                                                            <span>{DateUtils.format(new Date(post.date))}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="wb-profile-section-empty">
                                                    <p>No posts yet</p>
                                                </div>
                                            )}
                                        </div>
                                        {isCurrentUser && (
                                            <div className="wb-profile-section-footer">
                                                <Button variant="primary" size="sm" className="w-100" onClick={() => navigate("/Feed")}>
                                                    Go to Feed
                                                </Button>
                                            </div>
                                        )}
                                    </Card>
                                )}
                            </div>

                            {/* Right column */}
                            <div className="wb-profile-grid-col">

                                {/* Challenges */}
                                {overview && (isCurrentUser || totalSolved > 0) && (
                                    <ProfileChallengesCard
                                        solved={overview.challenges.solved}
                                        totals={overview.challenges.totals}
                                        attempting={overview.challenges.attempting}
                                        isCurrentUser={isCurrentUser}
                                        onShowSolved={showChallengesSection}
                                    />
                                )}

                                {/* Questions */}
                                {(isCurrentUser || questions.length > 0) && (
                                    <Card className="wb-profile-section border mb-3">
                                        <div className="wb-profile-section-header">
                                            <span className="wb-profile-section-title">
                                                <FaCommentAlt className="text-muted me-2" /> Questions
                                            </span>
                                            {questions.length > 0 && (
                                                <Button variant="link" size="sm" className="p-0" onClick={showQuestionsSection}>
                                                    Show All
                                                </Button>
                                            )}
                                        </div>
                                        <div>
                                            {questions.length > 0 ? (
                                                questions.map((question) => (
                                                    <Question key={question.id} question={question} searchQuery="" showUserProfile={false} />
                                                ))
                                            ) : (
                                                <div className="wb-profile-section-empty">
                                                    <p>No questions asked yet</p>
                                                </div>
                                            )}
                                        </div>
                                        {isCurrentUser && (
                                            <div className="wb-profile-section-footer">
                                                <Button variant="primary" size="sm" className="w-100" onClick={() => navigate("/Discuss/New")}>
                                                    Ask a Question
                                                </Button>
                                            </div>
                                        )}
                                    </Card>
                                )}

                            </div>
                        </div>
                    </Container>
                </>
            ) : (
                <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-center">
                    <Loader />
                </div>
            )}
        </div>
    );
};

const ProfileFromAuth = () => {
    const { userInfo } = useAuth();
    const location = useLocation();

    return (
        <>
            {userInfo ? (
                <Navigate to={"/Profile/" + userInfo.id} state={{ from: location }} replace />
            ) : (
                <Navigate to="/Users/Login" state={{ from: location }} replace />
            )}
        </>
    );
};

export { ProfileFromAuth };
export default ProfilePage;
