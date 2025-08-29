import { useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/context/authContext";
import { Badge, Button, Card, Col, Container, Dropdown, Row } from "react-bootstrap";
import ProfileSettings from "./ProfileSettings";
import countries from "../../../data/countries";
import { FaGear, FaHammer, FaStar } from "react-icons/fa6";
import Country from "../../../components/Country";
import FollowList from "./FollowList";
import CodesSection from "../components/CodesSection";
import Code, { ICode } from "../../codes/components/Code";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";
import ProfileAvatar from "../../../components/ProfileAvatar";
import Question, { IQuestion } from "../../discuss/components/Question";
import QuestionsSection from "../components/QuestionsSection";
import PageTitle from "../../../layouts/PageTitle";

export interface IUserNotifications {
    codes: boolean;
    discuss: boolean;
    followers: boolean;
    channels: boolean;
}

export interface UserDetails {
    id: string;
    name: string;
    email: string;
    bio: string;
    avatarImage: string;
    countryCode: string;
    followers: number;
    following: number;
    isFollowing: boolean;
    level: number;
    xp: number;
    codes: any[];
    emailVerified: boolean;
    active: boolean;
    roles: string[];
    notifications: IUserNotifications;
}

export interface UserMinimal {
    id: string;
    name: string;
    countryCode?: string;
    avatar: string;
    level?: number;
    isFollowing?: boolean;
}

const Profile = () => {
    const { sendJsonRequest } = useApi();
    const { userId } = useParams();

    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const { userInfo } = useAuth();
    const [followLoading, setFollowLoading] = useState(false);
    const [followingCount, setFollowingCount] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);

    const [followListVisible, setFollowListVisible] = useState(0);

    const [codes, setCodes] = useState<ICode[]>([]);
    const [codesSectionVisible, setCodesSectionVisible] = useState(false);

    const [questions, setQuestions] = useState<IQuestion[]>([]);
    const [questionsSectionVisible, setQuestionsSectionVisible] = useState(false);
    const [pageTitle, setPageTitle] = useState("Webler Codes");

    const navigate = useNavigate();

    PageTitle(pageTitle);

    useEffect(() => {
        setFollowListVisible(0);
        sendJsonRequest(`/Profile/GetProfile`, "POST", {
            userId
        })
            .then(data => {
                if (data.userDetails) {
                    setUserDetails(data.userDetails);
                    setFollowingCount(data.userDetails.following);
                    setFollowersCount(data.userDetails.followers);
                    setCodes(data.userDetails.codes.slice(0, 3));
                    setQuestions(data.userDetails.questions.slice(0, 3));
                    setPageTitle(data.userDetails.name);
                }
                else {
                    setUserDetails(null);
                }
            })
    }, [userId]);

    const onUserUpdate = (data: any) => {
        if (userDetails) {
            const newUserDetails = { ...userDetails, ...data };
            setUserDetails(newUserDetails);
        }
    }

    const handleFollow = async () => {
        if (!userDetails) {
            return;
        }
        setFollowLoading(true);
        let data = null;
        try {
            data = await sendJsonRequest(`/Profile/Follow`, "POST", { userId });
        }
        catch (err) { }
        if (data && data.success) {
            setUserDetails(userDetails => (userDetails ? { ...userDetails, isFollowing: true, followers: userDetails.followers + 1 } : null));
            setFollowersCount(count => count + 1)
        }
        setFollowLoading(false);
    }

    const handleUnfollow = async () => {
        if (!userDetails) {
            return;
        }
        setFollowLoading(true);
        let data = null;
        try {
            data = await sendJsonRequest(`/Profile/Unfollow`, "POST", { userId });
        }
        catch (err) { }
        if (data && data.success) {
            setUserDetails(userDetails => (userDetails ? { ...userDetails, isFollowing: false, followers: userDetails.followers - 1 } : null));
            setFollowersCount(count => count - 1)
        }
        setFollowLoading(false);
    }

    const closeFollowList = () => {
        setFollowListVisible(0);
    }

    const showFollowers = () => {
        setFollowListVisible(1);
    }

    const showFollowing = () => {
        setFollowListVisible(2);
    }

    const showCodesSection = () => {
        setCodesSectionVisible(true)
    }

    const closeCodesSection = () => {
        setCodesSectionVisible(false)
    }

    const showQuestionsSection = () => {
        setQuestionsSectionVisible(true);
    }

    const closeQuestionsSection = () => {
        setQuestionsSectionVisible(false);
    }

    const openPlaygroundMenu = () => {
        navigate("/Compiler-Playground")
    }

    const openDiscussAsk = () => {
        navigate("/Discuss/New");
    }
    const handleMessage = async () => {
        const result = await sendJsonRequest('/Channels/CreateDirectMessages', 'POST', {
            userId
        })
        if (result && result.channel) {
            navigate("/Channels/" + result.channel.id);
        }
    }

    const openSettings = () => {
        if (!userDetails) return;
        navigate("/Profile/" + userDetails.id + "?settings=true");
    }

    let isCurrentUser = userInfo && userInfo.id === userId;

    let codesSectionContent = isCurrentUser || codes.length > 0 ?
        <Col>
            <Card className="p-2 wb-p-section__card">
                <div className="d-flex justify-content-between align-items-center">
                    <h3>Codes</h3>
                    <Button onClick={showCodesSection} variant="link">Show All</Button>
                </div>
                <div className="mt-2">
                    {
                        codes.length > 0 ?
                            codes.map(code => {
                                return (
                                    <div className="mt-2" key={code.id}>
                                        <Code code={code} searchQuery="" showUserProfile={false} />
                                    </div>
                                );
                            })
                            :
                            <div className="text-center py-4">
                                <p className="text-secondary">You do not have saved any codes</p>
                            </div>
                    }
                    {
                        isCurrentUser &&
                        <div className="mt-3">
                            <Button onClick={openPlaygroundMenu} className="w-100">Add New</Button>
                        </div>
                    }
                </div>
            </Card>
        </Col>
        :
        <></>

    let questionSectionContent = isCurrentUser || codes.length > 0 ?
        <Col>
            <Card className="p-2 wb-p-section__card">
                <div className="d-flex justify-content-between align-items-center">
                    <h3>Questions</h3>
                    <Button onClick={showQuestionsSection} variant="link">Show All</Button>
                </div>
                <div className="mt-2">
                    {
                        questions.length > 0 ?
                            questions.map(question => {
                                return (
                                    <div className="mt-2" key={question.id}>
                                        <Question question={question} searchQuery="" showUserProfile={false} />
                                    </div>
                                );
                            })
                            :
                            <div className="text-center py-4">
                                <p className="text-secondary">You have not asked any questions</p>
                            </div>
                    }
                    {
                        isCurrentUser &&
                        <div className="mt-3">
                            <Button onClick={openDiscussAsk} className="w-100">Ask</Button>
                        </div>
                    }
                </div>
            </Card>
        </Col>
        :
        <></>

    let badge = (() => {
        if (userDetails?.roles.includes("Moderator")) {
            return <Badge className="wb-p-details__avatar-badge" bg="secondary">Moderator</Badge>
        }

        return <></>
    })()

    return (
        <div className="wb-p-container">
            {
                userDetails ?
                    <>
                        {
                            codesSectionVisible &&
                            <CodesSection userId={userDetails.id} onClose={closeCodesSection} />
                        }
                        {
                            questionsSectionVisible &&
                            <QuestionsSection userId={userDetails.id} onClose={closeQuestionsSection} />
                        }
                        {
                            followListVisible == 1 &&
                            <FollowList onClose={closeFollowList} options={{ title: "Followers", urlPath: `/Profile/GetFollowers`, setCount: setFollowingCount, userId: userDetails.id }} />
                        }
                        {
                            followListVisible == 2 &&
                            <FollowList onClose={closeFollowList} options={{ title: "Following", urlPath: `/Profile/GetFollowing`, setCount: setFollowingCount, userId: userDetails.id }} />
                        }
                        {
                            isCurrentUser &&
                            <ProfileSettings userDetails={userDetails} onUpdate={onUserUpdate} />
                        }
                        <Container className="p-2">
                            <Card className="p-2">
                                <div className="wb-discuss-reply__edit-button">
                                    <Dropdown drop="start">
                                        <Dropdown.Toggle as={EllipsisDropdownToggle} />
                                        <Dropdown.Menu>
                                            {
                                                isCurrentUser &&
                                                <Dropdown.Item onClick={openSettings}><FaGear /> Settings</Dropdown.Item>
                                            }
                                            {
                                                (userInfo &&
                                                    userInfo.roles.some(role => ["Moderator", "Admin"].includes(role)) &&
                                                    !userDetails.roles.some(role => ["Moderator", "Admin"].includes(role))) &&
                                                <Dropdown.Item as={Link} to={`/Admin/UserSearch/${userDetails.id}`}>
                                                    <FaHammer /> Open in Mod View
                                                </Dropdown.Item>
                                            }
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </div>
                                <div className="d-block d-md-flex gap-3">
                                    <div className="wb-p-details__avatar">
                                        <ProfileAvatar size={96} avatarImage={userDetails.avatarImage} />
                                        {badge}
                                    </div>
                                    <div className="d-flex flex-column align-items-center align-items-md-start">
                                        <div className="d-flex wb-p-details__row">
                                            <p className="wb-p-details__name text-center" style={{ fontFamily: "monospace", textDecoration: userDetails.active ? "none" : "line-through" }}>{userDetails.name}</p>
                                        </div>
                                        <div>
                                            {
                                                userInfo && userDetails.id !== userInfo.id
                                                &&
                                                (
                                                    <div className="d-flex wb-p-details__row">
                                                        {
                                                            userDetails.isFollowing ?
                                                                <Button variant="primary" size="sm" onClick={handleUnfollow} disabled={followLoading}>Unfollow</Button>
                                                                :
                                                                <Button variant="primary" size="sm" onClick={handleFollow} disabled={followLoading}>Follow</Button>
                                                        }
                                                        <Button className="ms-1" variant="primary" size="sm" onClick={handleMessage}>Message</Button>

                                                    </div>
                                                )
                                            }
                                        </div>
                                        <div className="wb-p-details__row">
                                            {
                                                followingCount > 0 ?
                                                    <button className="wb-p-details__follows__button" onClick={showFollowing}>{followingCount} Following</button>
                                                    :
                                                    <span>{followingCount} Following</span>
                                            }
                                            {
                                                followersCount > 0 ?
                                                    <button className="wb-p-details__follows__button ms-2" onClick={showFollowers}>{followersCount} Followers</button>
                                                    :
                                                    <span className="ms-2">{followersCount} Followers</span>
                                            }

                                        </div>
                                        <p className="wb-p-details__row">
                                            <FaStar style={{ color: "gold" }} />
                                            <b>{userDetails.xp} XP</b>
                                        </p>
                                        <div className="wb-p-details__row">
                                            <p className="text-secondary wb-p-details__bio small">{userDetails.bio}</p>
                                        </div>
                                        <div className="wb-p-details__row">
                                            {
                                                userDetails.countryCode &&
                                                <>
                                                    {<Country country={countries.find(country => country.code === userDetails.countryCode)!} />}
                                                    <span className="mx-2">·</span>
                                                </>
                                            }
                                            Lvl {userDetails.level}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                            <Row className="mt-2 row-cols-1 row-cols-md-2 row-gap-2">
                                {
                                    codesSectionContent
                                }
                                {
                                    questionSectionContent
                                }
                            </Row>
                        </Container>
                    </>
                    :
                    <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-center">
                        <div className="wb-loader">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>

            }
        </div>
    )
}

const ProfileFromAuth = () => {
    const { userInfo } = useAuth()
    const location = useLocation();

    return (
        <>
            {
                userInfo ?
                    <Navigate to={"/Profile/" + userInfo.id} state={{ from: location }} replace />
                    :
                    <Navigate to="/Users/Login" state={{ from: location }} replace />
            }
        </>
    )
}

export { ProfileFromAuth, Profile }