import { useCallback, useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/context/authContext";
import { Badge, Button, Card, Container, Dropdown } from "react-bootstrap";
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
import PageTitle from "../../../layouts/PageTitle";
import Loader from "../../../components/Loader";
import NotificationToast from "../../../components/NotificationToast";
import ChallengesSection from "../components/ChallengesSection";
import { GetProfileData, UserDetails } from "../types";
import { CodeMinimal } from "../../codes/types";
import { QuestionMinimal } from "../../discuss/types";
import { FeedDetails, FeedListData } from "../../feed/types";
import { CourseMinimal, UserCoursesListData } from "../../courses/types";
import RolesEnum from "../../../data/RolesEnum";
import { CreateDirectMessagesData } from "../../channels/types";
import DateUtils from "../../../utils/DateUtils";
import { FaBan, FaCode, FaCommentAlt, FaNewspaper } from "react-icons/fa";
import { FaBookOpen } from "react-icons/fa6";
import { LinkContainer } from "react-router-bootstrap";
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

    const [codes, setCodes] = useState<CodeMinimal[]>([]);
    const [codesSectionVisible, setCodesSectionVisible] = useState(false);

    const [questions, setQuestions] = useState<QuestionMinimal[]>([]);
    const [questionsSectionVisible, setQuestionsSectionVisible] = useState(false);

    const [challengesSectionVisible, setChallengesSectionVisible] = useState(false);

    const [feedPosts, setFeedPosts] = useState<FeedDetails[]>([]);
    const [courses, setCourses] = useState<CourseMinimal[]>([]);

    const [pageTitle, setPageTitle] = useState("Webler Codes");
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const navigate = useNavigate();

    PageTitle(pageTitle);

    useEffect(() => {
        const fetchProfile = async () => {
            setFollowListTitle("");
            const result = await sendJsonRequest<GetProfileData>(`/Profile/GetProfile`, "POST", { userId });
            if (result.data) {
                setUserDetails(result.data.userDetails);
                setFollowingCount(result.data.userDetails.following);
                setFollowersCount(result.data.userDetails.followers);
                setCodes(result.data.userDetails.codes.slice(0, 3));
                setQuestions(result.data.userDetails.questions.slice(0, 3));
                setPageTitle(result.data.userDetails.name);
            } else {
                setUserDetails(null);
            }
        };
        fetchProfile();
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        const fetchFeed = async () => {
            const result = await sendJsonRequest<FeedListData>(`/Feed`, "POST", {
                page: 1, count: 3, filter: 2, userId
            });
            if (result.data) setFeedPosts(result.data.feeds);
        };
        const fetchCourses = async () => {
            const result = await sendJsonRequest<UserCoursesListData>(`/Courses/GetUserCourses`, "POST", { userId });
            if (result.data) setCourses(result.data.courses);
        };
        fetchFeed();
        fetchCourses();
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

    const easySolved = userDetails?.solvedChallenges.easy ?? 0;
    const mediumSolved = userDetails?.solvedChallenges.medium ?? 0;
    const hardSolved = userDetails?.solvedChallenges.hard ?? 0;
    const totalSolved = easySolved + mediumSolved + hardSolved;

    return (
        <div className="wb-p-container">
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
                        <Card className="wb-p-header border mb-3">
                            {
                                userInfo &&
                                <div className="wb-p-header__menu">
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

                            <div className="wb-p-header__body">
                                {/* Avatar */}
                                <div className="wb-p-header__avatar-wrap">
                                    <ProfileAvatar size={80} avatarUrl={userDetails.avatarUrl} />
                                    {userDetails.roles.includes(RolesEnum.MODERATOR) && (
                                        <Badge className="wb-p-header__badge" bg="secondary">Moderator</Badge>
                                    )}
                                    {userDetails.isBlocked && (
                                        <Badge className="wb-p-header__badge" bg="danger"><FaBan /> Blocked</Badge>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="wb-p-header__info">
                                    <div className="wb-p-header__name-row">
                                        <span
                                            className="wb-p-header__name"
                                            style={{ textDecoration: userDetails.active ? "none" : "line-through" }}
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
                                        <p className="wb-p-header__bio">{userDetails.bio}</p>
                                    )}

                                    <div className="wb-p-header__meta">
                                        <button className="wb-p-follows-btn" onClick={showFollowing}>
                                            <b>{followingCount}</b> Following
                                        </button>
                                        <button className="wb-p-follows-btn" onClick={showFollowers}>
                                            <b>{followersCount}</b> Followers
                                        </button>
                                        <span className="wb-p-header__stat">
                                            <FaStar style={{ color: "gold" }} /> <b>{userDetails.xp}</b> XP
                                        </span>
                                        <span className="wb-p-header__stat text-muted">
                                            Lvl {userDetails.level}
                                        </span>
                                        {userDetails.countryCode && (
                                            <span className="wb-p-header__stat">
                                                <Country country={countries.find(c => c.code === userDetails.countryCode)!} />
                                            </span>
                                        )}
                                    </div>

                                    {/* Challenges stats inline */}
                                    {(isCurrentUser || totalSolved > 0) && (
                                        <div className="wb-p-header__challenges">
                                            <button
                                                className="wb-p-challenges-pill bg-success-subtle border-success-subtle text-success"
                                                onClick={totalSolved > 0 ? showChallengesSection : undefined}
                                            >
                                                <Badge bg="success">Easy</Badge> {easySolved}
                                            </button>
                                            <button
                                                className="wb-p-challenges-pill bg-warning-subtle border-warning-subtle text-warning-emphasis"
                                                onClick={totalSolved > 0 ? showChallengesSection : undefined}
                                            >
                                                <Badge bg="warning" text="dark">Medium</Badge> {mediumSolved}
                                            </button>
                                            <button
                                                className="wb-p-challenges-pill bg-danger-subtle border-danger-subtle text-danger"
                                                onClick={totalSolved > 0 ? showChallengesSection : undefined}
                                            >
                                                <Badge bg="danger">Hard</Badge> {hardSolved}
                                            </button>
                                            {isCurrentUser && (
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="p-0 ms-1"
                                                    onClick={() => navigate("/Challenge")}
                                                >
                                                    Solve more
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* ── Courses Row ── */}
                        {(isCurrentUser || courses.length > 0) && (
                            <Card className="wb-p-section border-0 mb-3">
                                <div className="wb-p-section__header" style={{ borderBottom: "none" }}>
                                    <span className="wb-p-section__title">
                                        <FaBookOpen className="text-muted me-2" /> Courses
                                    </span>
                                    {courses.length > 0 && (
                                        <LinkContainer to="/Courses">
                                            <Button variant="link" size="sm" className="p-0">Browse</Button>
                                        </LinkContainer>
                                    )}
                                </div>
                                {courses.length > 0 ? (
                                    <div className="wb-p-courses-scroll">
                                        {courses.map((course) => (
                                            <div
                                                key={course.id}
                                                className="wb-p-courses-card"
                                                onClick={() => navigate("/Courses/" + course.code)}
                                            >
                                                <div className="wb-p-courses-card__img">
                                                    <img
                                                        src={course.coverImageUrl || "/resources/images/logoicon.svg"}
                                                        alt={course.title}
                                                    />
                                                </div>
                                                <span className="wb-p-courses-card__title">{course.title}</span>
                                                <Badge
                                                    bg={course.completed ? "success" : "info"}
                                                    text={course.completed ? undefined : "dark"}
                                                    className="wb-p-courses-card__badge"
                                                >
                                                    {course.completed ? "Completed" : "In Progress"}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="wb-p-section__empty">
                                        <p>No courses enrolled yet</p>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* ── Content Grid ── */}
                        <div className="wb-p-grid">

                            {/* Left column */}
                            <div className="wb-p-grid__col">

                                {/* Codes */}
                                {(isCurrentUser || codes.length > 0) && (
                                    <Card className="wb-p-section border mb-3">
                                        <div className="wb-p-section__header">
                                            <span className="wb-p-section__title">
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
                                                <div className="wb-p-section__empty">
                                                    <p>No codes saved yet</p>
                                                </div>
                                            )}
                                        </div>
                                        {isCurrentUser && (
                                            <div className="wb-p-section__footer">
                                                <Button variant="primary" size="sm" className="w-100" onClick={() => navigate("/Compiler-Playground")}>
                                                    Add New
                                                </Button>
                                            </div>
                                        )}
                                    </Card>
                                )}

                                {/* Feed Posts */}
                                {(isCurrentUser || feedPosts.length > 0) && (
                                    <Card className="wb-p-section border mb-3">
                                        <div className="wb-p-section__header">
                                            <span className="wb-p-section__title">
                                                <FaNewspaper className="text-muted me-2" /> Posts
                                            </span>
                                            {feedPosts.length > 0 && (
                                                <LinkContainer to="/Feed">
                                                    <Button variant="link" size="sm" className="p-0">View Feed</Button>
                                                </LinkContainer>
                                            )}
                                        </div>
                                        <div>
                                            {feedPosts.length > 0 ? (
                                                feedPosts.map((post) => (
                                                    <div
                                                        key={post.id}
                                                        className="wb-p-feed-item border-bottom"
                                                        onClick={() => navigate("/Feed/" + post.id)}
                                                    >
                                                        <p className="wb-p-feed-item__text">{post.message}</p>
                                                        <div className="wb-p-feed-item__meta">
                                                            <span className="d-flex align-items-center gap-1">
                                                                <FaCommentAlt size={11} /> {post.answers}
                                                            </span>
                                                            <span>{DateUtils.format(new Date(post.date))}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="wb-p-section__empty">
                                                    <p>No posts yet</p>
                                                </div>
                                            )}
                                        </div>
                                        {isCurrentUser && (
                                            <div className="wb-p-section__footer">
                                                <Button variant="primary" size="sm" className="w-100" onClick={() => navigate("/Feed")}>
                                                    Go to Feed
                                                </Button>
                                            </div>
                                        )}
                                    </Card>
                                )}
                            </div>

                            {/* Right column */}
                            <div className="wb-p-grid__col">

                                {/* Questions */}
                                {(isCurrentUser || questions.length > 0) && (
                                    <Card className="wb-p-section border mb-3">
                                        <div className="wb-p-section__header">
                                            <span className="wb-p-section__title">
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
                                                <div className="wb-p-section__empty">
                                                    <p>No questions asked yet</p>
                                                </div>
                                            )}
                                        </div>
                                        {isCurrentUser && (
                                            <div className="wb-p-section__footer">
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
