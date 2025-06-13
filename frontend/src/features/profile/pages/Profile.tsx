import { useEffect, useState } from "react";
import { useApi } from "../../../context/apiCommunication";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/context/authContext";
import { Badge, Button, Card, Col, Container, Dropdown, Row } from "react-bootstrap";
import ProfileSettings from "./ProfileSettings";
import countries from "../../../data/countries";
import { FaStar } from "react-icons/fa6";
import Country from "../../../components/Country";
import FollowList from "./FollowList";
import CodesSection from "../components/CodesSection";
import Code from "../../codes/components/Code";
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle";
import ProfileAvatar from "../../../components/ProfileAvatar";

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
}

export interface UserMinimal {
    id: string;
    name: string;
    countryCode: string;
    avatar: string;
    level: number;
    isFollowing: boolean;
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

    const [codes, setCodes] = useState<any[]>([])
    const [codesSectionVisible, setCodesSectionVisible] = useState(false);

    const navigate = useNavigate();

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
                    setCodes(data.userDetails.codes.slice(0, 3))
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

    const setPageTitle = (userName: string) => {
        { document.title = userName + " | Webler" }
    }

    const openPlaygroundMenu = () => {
        navigate("/Compiler-Playground")
    }

    const toggleUserBan = async () => {
        if (!userDetails) {
            return;
        }

        if (confirm(userDetails.active ? "Are you sure you want to deactivate this user?" : "Are you sure you want to activate this user?")) {
            const result = await sendJsonRequest(`/Profile/ToggleUserBan`, "POST", { userId, active: !userDetails.active });
            if (result.success) {
                setUserDetails(details => {
                    return details ? { ...details, active: result.active } : null
                })
                alert(result.active ? "User is activated" : "User is deactivated");
            }
            else {
                alert("Something went wrong")
            }
        }

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
                            followListVisible == 1 &&
                            <FollowList onClose={closeFollowList} options={{ title: "Followers", urlPath: `/Profile/GetFollowers`, setCount: setFollowingCount, userId: userDetails.id }} />
                        }
                        {
                            followListVisible == 2 &&
                            <FollowList onClose={closeFollowList} options={{ title: "Following", urlPath: `/Profile/GetFollowing`, setCount: setFollowingCount, userId: userDetails.id }} />
                        }
                        {setPageTitle(userDetails.name)}
                        <ProfileSettings userDetails={userDetails} onUpdate={onUserUpdate} />
                        <Container className="p-2">
                            <Card className="p-2">
                                <div className="wb-discuss-reply__edit-button">
                                    <Dropdown drop="start">
                                        <Dropdown.Toggle as={EllipsisDropdownToggle} />
                                        <Dropdown.Menu>
                                            {
                                                (userInfo &&
                                                    userInfo.roles.includes("Moderator") &&
                                                    !(userDetails.roles.includes("Moderator") || userDetails.roles.includes("Admin"))) &&
                                                <Dropdown.Item onClick={toggleUserBan}>{userDetails.active ? "Deactivate" : "Activate"}</Dropdown.Item>
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
                            <Row className="mx-0 mt-2 row-cols-1 row-cols-lg-2 row-gap-2">
                                {
                                    codesSectionContent
                                }
                            </Row>
                        </Container>
                    </>
                    :
                    <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center text-center">
                        <h3>Sorry, couldn't find anything</h3>
                        <p className="text-secondary">This user has just started their journey, try checking out their profile later.</p>
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