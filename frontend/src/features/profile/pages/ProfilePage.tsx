import { useCallback, useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/context/authContext";
import { Badge, Button, Card, Col, Container, Dropdown, Row } from "react-bootstrap";
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
import RolesEnum from "../../../data/RolesEnum";
import { CreateDirectMessagesData } from "../../channels/types";

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
        }
        fetchProfile();
    }, [userId]);

    const showNotification = useCallback((type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    const onUserUpdate = (data: Partial<UserDetails>) => {
        if (userDetails) {
            setUserDetails({ ...userDetails, ...data });
        }
    };

    const handleFollow = async () => {
        if (!userDetails) return;
        setFollowLoading(true);
        const result = await sendJsonRequest(`/Profile/Follow`, "POST", { userId });
        if (result.success) {
            setUserDetails((ud) => (ud ? { ...ud, isFollowing: true, followers: ud.followers + 1 } : null));
            setFollowersCount((count) => count + 1);
        }
        setFollowLoading(false);
    };

    const handleUnfollow = async () => {
        if (!userDetails) return;
        setFollowLoading(true);
        const result = await sendJsonRequest(`/Profile/Unfollow`, "POST", { userId });
        if (result.success) {
            setUserDetails((ud) => (ud ? { ...ud, isFollowing: false, followers: ud.followers - 1 } : null));
            setFollowersCount((count) => count - 1);
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

    const openPlaygroundMenu = () => navigate("/Compiler-Playground");
    const openDiscussAsk = () => navigate("/Discuss/New");
    const openChallenges = () => navigate("/Challenge");

    const handleMessage = async () => {
        const result = await sendJsonRequest<CreateDirectMessagesData>("/Channels/CreateDirectMessages", "POST", { userId });
        if (result.data) {
            navigate("/Channels/" + result.data.channel.id);
        } else {
            showNotification("error", result.error?.[0]?.message ?? "Something went wrong");
        }
    };

    const openSettings = () => {
        if (!userDetails) return;
        navigate("/Profile/" + userDetails.id + "?settings=true");
    };

    const isCurrentUser = !!userInfo && userInfo.id === userId;
    const isAdmin = !!userInfo && userInfo.roles.includes(RolesEnum.ADMIN);

    const codesSectionContent = (isCurrentUser || codes.length > 0) ? (
        <Col>
            <Card className="p-2 wb-p-section__card">
                <div className="d-flex justify-content-between align-items-center">
                    <h3>Codes</h3>
                    {codes.length > 0 && <Button onClick={showCodesSection} variant="link">Show All</Button>}
                </div>
                <div className="mt-2">
                    {codes.length > 0 ? (
                        codes.map((code) => (
                            <div key={code.id}>
                                <Code code={code} searchQuery="" showUserProfile={false} />
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-secondary">You do not have saved any codes</p>
                        </div>
                    )}

                    {isCurrentUser && (
                        <div className="mt-3">
                            <Button onClick={openPlaygroundMenu} className="w-100">Add New</Button>
                        </div>
                    )}
                </div>
            </Card>
        </Col>
    ) : <></>;

    const questionSectionContent = (isCurrentUser || questions.length > 0) ? (
        <Col>
            <Card className="p-2 wb-p-section__card">
                <div className="d-flex justify-content-between align-items-center">
                    <h3>Questions</h3>
                    {questions.length > 0 && <Button onClick={showQuestionsSection} variant="link">Show All</Button>}
                </div>
                <div className="mt-2">
                    {questions.length > 0 ? (
                        questions.map((question) => (
                            <div className="mt-2" key={question.id}>
                                <Question question={question} searchQuery="" showUserProfile={false} />
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-secondary">You have not asked any questions</p>
                        </div>
                    )}

                    {isCurrentUser && (
                        <div className="mt-3">
                            <Button onClick={openDiscussAsk} className="w-100">Ask</Button>
                        </div>
                    )}
                </div>
            </Card>
        </Col>
    ) : <></>;

    const easySolved = userDetails?.solvedChallenges.easy ?? 0;
    const mediumSolved = userDetails?.solvedChallenges.medium ?? 0;
    const hardSolved = userDetails?.solvedChallenges.hard ?? 0;
    const totalSolved = easySolved + mediumSolved + hardSolved;

    const challengesSectionContent = (isCurrentUser || totalSolved > 0) ? (
        <Col xs={12}>
            <Card className="p-2 wb-p-section__card">
                <div className="d-flex justify-content-between align-items-center">
                    <h3 className="mb-0">Challenges</h3>
                    {easySolved + mediumSolved + hardSolved > 0 && <Button onClick={showChallengesSection} variant="link">Show All</Button>}
                </div>

                <div className="mt-3 d-flex flex-wrap gap-2">
                    <div className="wb-p-details-challenges-summary__pill">
                        <Badge bg="success" className="me-2">Easy</Badge>
                        <span className="fw-semibold">{easySolved}</span>
                    </div>

                    <div className="wb-p-details-challenges-summary__pill">
                        <Badge className="bg-warning text-dark me-2">Medium</Badge>
                        <span className="fw-semibold">{mediumSolved}</span>
                    </div>

                    <div className="wb-p-details-challenges-summary__pill">
                        <Badge bg="danger" className="me-2">Hard</Badge>
                        <span className="fw-semibold">{hardSolved}</span>
                    </div>
                </div>

                {isCurrentUser && (
                    <div className="mt-3">
                        <Button onClick={openChallenges} className="w-100">Solve</Button>
                    </div>
                )}
            </Card>
        </Col>
    ) : <></>;

    const badge = (() => {
        if (userDetails?.roles.includes(RolesEnum.MODERATOR)) {
            return <Badge className="wb-p-details__avatar-badge" bg="secondary">Moderator</Badge>;
        }
        return <></>;
    })();

    return (
        <div className="wb-p-container">
            {userDetails ? (
                <>
                    <NotificationToast notification={notification} onClose={() => setNotification(null)} />

                    {codesSectionVisible && (
                        <CodesSection userId={userDetails.id} onClose={closeCodesSection} />
                    )}

                    {questionsSectionVisible && (
                        <QuestionsSection userId={userDetails.id} onClose={closeQuestionsSection} />
                    )}

                    {challengesSectionVisible && (
                        <ChallengesSection userId={userDetails.id} onClose={closeChallengesSection} />
                    )}

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

                    <Container className="p-2">
                        <Card className="p-2">
                            <div className="wb-edit-button">
                                <Dropdown drop="start">
                                    <Dropdown.Toggle as={EllipsisDropdownToggle} />
                                    <Dropdown.Menu>
                                        {(isCurrentUser || isAdmin) && (
                                            <Dropdown.Item onClick={openSettings}><FaGear /> Settings</Dropdown.Item>
                                        )}
                                        {(userInfo && userInfo.roles.some(role => ["Moderator", "Admin"].includes(role))) && (
                                            <Dropdown.Item as={Link} to={`/Admin/UserSearch/${userDetails.id}`}>
                                                <FaHammer /> Open in Mod View
                                            </Dropdown.Item>
                                        )}
                                    </Dropdown.Menu>
                                </Dropdown>
                            </div>

                            <div className="d-block d-md-flex gap-3">
                                <div className="wb-p-details__avatar">
                                    <ProfileAvatar size={96} avatarUrl={userDetails.avatarUrl} />
                                    {badge}
                                </div>

                                <div className="d-flex flex-column align-items-center align-items-md-start">
                                    <div className="d-flex wb-p-details__row">
                                        <p
                                            className="wb-p-details__name text-center"
                                            style={{
                                                fontFamily: "monospace",
                                                textDecoration: userDetails.active ? "none" : "line-through",
                                            }}
                                        >
                                            {userDetails.name}
                                        </p>
                                    </div>

                                    <div>
                                        {userInfo && userDetails.id !== userInfo.id && (
                                            <div className="d-flex wb-p-details__row">
                                                {userDetails.isFollowing ? (
                                                    <Button variant="primary" size="sm" onClick={handleUnfollow} disabled={followLoading}>
                                                        Unfollow
                                                    </Button>
                                                ) : (
                                                    <Button variant="primary" size="sm" onClick={handleFollow} disabled={followLoading}>
                                                        Follow
                                                    </Button>
                                                )}

                                                {userDetails.roles.includes(RolesEnum.USER) && (
                                                    <Button className="ms-1" variant="primary" size="sm" onClick={handleMessage}>
                                                        Message
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="wb-p-details__row">
                                        {followingCount > 0 ? (
                                            <button className="wb-p-details__follows__button" onClick={showFollowing}>
                                                {followingCount} Following
                                            </button>
                                        ) : (
                                            <span>{followingCount} Following</span>
                                        )}

                                        {followersCount > 0 ? (
                                            <button className="wb-p-details__follows__button ms-2" onClick={showFollowers}>
                                                {followersCount} Followers
                                            </button>
                                        ) : (
                                            <span className="ms-2">{followersCount} Followers</span>
                                        )}
                                    </div>

                                    <p className="wb-p-details__row">
                                        <FaStar style={{ color: "gold" }} />
                                        <b>{userDetails.xp} XP</b>
                                    </p>

                                    <div className="wb-p-details__row">
                                        <p className="text-secondary wb-p-details__bio small">{userDetails.bio}</p>
                                    </div>

                                    <div className="wb-p-details__row">
                                        {userDetails.countryCode && (
                                            <>
                                                <Country country={countries.find((country) => country.code === userDetails.countryCode)!} />
                                                <span className="mx-2">·</span>
                                            </>
                                        )}
                                        Lvl {userDetails.level}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Row className="mt-2 row-cols-1 row-gap-2">
                            {challengesSectionContent}
                        </Row>

                        <Row className="mt-2 row-cols-1 row-cols-md-2 row-gap-2">
                            {codesSectionContent}
                            {questionSectionContent}
                        </Row>
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
