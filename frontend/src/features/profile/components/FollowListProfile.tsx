import React, { useState } from 'react'
import { UserMinimal } from '../pages/Profile'
import Country from '../../../components/Country';
import countries from '../../../data/countries';
import { Button } from 'react-bootstrap';
import ApiCommunication from '../../../helpers/apiCommunication';
import { useAuth } from '../../auth/context/authContext';
import ProfileName from '../../../components/ProfileName';
import { useNavigate } from 'react-router-dom';

interface FollowListProfileProps {
    user: UserMinimal;
    viewedUserId: string;
    setCount: (callback: (data: number) => number) => void;
}

const FollowListProfile = React.forwardRef(({ user, viewedUserId, setCount }: FollowListProfileProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const navigate = useNavigate();
    const [followLoading, setFollowLoading] = useState(false);
    const [following, setFollowing] = useState(user.isFollowing);
    const { userInfo } = useAuth();

    const handleFollow = async () => {
        if (!userInfo) {
            navigate("/Users/Login")
            return
        }
        setFollowLoading(true);
        let data = null;
        try {
            data = await ApiCommunication.sendJsonRequest(`/Profile/Follow`, "POST", { userId: user.id });
        }
        catch (err) { }
        if (data && data.success) {
            setFollowing(true);
            if (viewedUserId === userInfo.id) {
                setCount(count => count + 1)
            }
        }
        setFollowLoading(false);
    }

    const handleUnfollow = async () => {
        if (!userInfo) {
            navigate("/Users/Login")
            return
        }
        setFollowLoading(true);
        let data = null;
        try {
            data = await ApiCommunication.sendJsonRequest(`/Profile/Unfollow`, "POST", { userId: user.id });
        }
        catch (err) { }
        if (data && data.success) {
            setFollowing(false);
            if (viewedUserId === userInfo.id) {
                setCount(count => count - 1)
            }
        }
        setFollowLoading(false);
    }

    const body = (
        <div className="d-flex">
            <div className="wb-p-follow-item__avatar">
                <img className="wb-p-follow-item__avatar-image" src="/resources/images/user.svg" />
            </div>
            <div>
                <ProfileName userId={user.id} userName={user.name} />
                <div>
                    {
                        user.countryCode &&
                        <>
                            {<Country country={countries.find(country => country.code === user.countryCode)!} />}
                            <span className="mx-2">·</span>
                        </>
                    }
                    Lvl {user.level}
                </div>
                {
                    userInfo &&
                    <div>
                        {
                            userInfo.id != user.id && (
                                following ?
                                    <Button variant="secondary" size="sm" onClick={handleUnfollow} disabled={followLoading}>Following</Button>
                                    :
                                    <Button variant="primary" size="sm" onClick={handleFollow} disabled={followLoading}>Follow</Button>
                            )
                        }
                    </div>
                }
            </div>
        </div>
    )
    const content = ref ?
        <div ref={ref}>{body}</div>
        :
        <div>{body}</div>
    return content
})

export default FollowListProfile