import { useEffect, useState } from "react";
import ApiCommunication from "../../../helpers/apiCommunication";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../auth/context/authContext";
import { Button, Card, Container } from "react-bootstrap";
import ProfileSettings from "./ProfileSettings";
import countries from "../../../data/countries";
import { FaStar } from "react-icons/fa6";
import Country from "../../../components/Country";
import FollowList from "./FollowList";

export interface UserDetails {
    id: string;
    name: string;
    email: string;
    bio: string;
    countryCode: string;
    followers: number;
    following: number;
    isFollowing: boolean;
    level: number;
    xp: number;
}

export interface UserMinimal {
    id: string;
    name: string;
    countryCode: string;
    level: number;
    isFollowing: boolean;
}

const Profile = () => {

    const { userId } = useParams();

    const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
    const { userInfo } = useAuth();
    const [followLoading, setFollowLoading] = useState(false);
    const [followingCount, setFollowingCount] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);

    const [followListVisible, setFollowListVisible] = useState(0);

    useEffect(() => {
        setFollowListVisible(0);
        ApiCommunication.sendJsonRequest(`/Profile/${userId}`, "GET")
            .then(data => {
                if (data.userDetails) {
                    setUserDetails(data.userDetails);
                    setFollowingCount(data.userDetails.following);
                    setFollowersCount(data.userDetails.followers);
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
            data = await ApiCommunication.sendJsonRequest(`/Profile/Follow/${userId}`, "POST");
        }
        catch (err) { }
        if (data && data.success) {
            const newUserDetails = { ...userDetails, isFollowing: true, followers: userDetails.followers + 1 };
            setUserDetails(newUserDetails);
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
            data = await ApiCommunication.sendJsonRequest(`/Profile/Unfollow/${userId}`, "POST");
        }
        catch (err) { }
        if (data && data.success) {
            const newUserDetails = { ...userDetails, isFollowing: false, followers: userDetails.followers - 1 };
            setUserDetails(newUserDetails);
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

    const setPageTitle = (userName: string) => {
        { document.title = userName + " | Webler" }
    }

    return (
        <div className="wb-p-container">
            {
                userDetails &&
                <>
                    {
                        followListVisible == 1 &&
                        <FollowList onClose={closeFollowList} options={{ title: "Followers", urlPath: `/Profile/${userId}/followers`, setCount: setFollowingCount }} />
                    }
                    {
                        followListVisible == 2 &&
                        <FollowList onClose={closeFollowList} options={{ title: "Following", urlPath: `/Profile/${userId}/following`, setCount: setFollowingCount }} />
                    }
                    {setPageTitle(userDetails.name)}
                    <ProfileSettings userDetails={userDetails} onUpdate={onUserUpdate} />
                    <Container>
                        <Card className="mt-4 p-2">
                            <div className="d-block d-md-flex gap-3">
                                <div className="wb-p-details__avatar">
                                    <img className="wb-p-details__avatar-image" src="/resources/images/user.svg" />
                                </div>
                                <div className="d-flex flex-column align-items-center align-items-md-start">
                                    <div className="d-flex wb-p-details__row">
                                        <p className="wb-p-details__name" style={{ fontFamily: "monospace" }}>{userDetails.name}</p>
                                    </div>
                                    <div>
                                        {
                                            userInfo && userDetails.id !== userInfo.id
                                            &&
                                            (
                                                <div className="d-flex wb-p-details__row">
                                                    {
                                                        userDetails.isFollowing ?
                                                            <Button variant="primary" onClick={handleUnfollow} disabled={followLoading}>Unfollow</Button>
                                                            :
                                                            <Button variant="primary" onClick={handleFollow} disabled={followLoading}>Follow</Button>
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
                                                <span>{userDetails.following} Following</span>
                                        }
                                        {
                                            followersCount > 0 ?
                                                <button className="wb-p-details__follows__button ms-2" onClick={showFollowers}>{followersCount} Followers</button>
                                                :
                                                <span className="ms-2">{userDetails.followers} Followers</span>
                                        }

                                    </div>
                                    <p className="wb-p-details__row">
                                        <FaStar style={{ color: "gold" }} />
                                        <b>{userDetails.xp} XP</b>
                                    </p>
                                    <div className="wb-p-details__row">
                                        <p className="text-secondary wb-p-details__bio">{userDetails.bio}</p>
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
                    </Container>
                </>
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
                    <Navigate to="/Login" state={{ from: location }} replace />
            }
        </>
    )
}

export { ProfileFromAuth, Profile }