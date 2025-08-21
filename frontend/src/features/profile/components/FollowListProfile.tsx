import React, { useState } from 'react'
import { UserMinimal } from '../pages/Profile'
import Country from '../../../components/Country';
import countries from '../../../data/countries';
import { Button } from 'react-bootstrap';
import { useApi } from '../../../context/apiCommunication';
import { useAuth } from '../../auth/context/authContext';
import ProfileName from '../../../components/ProfileName';
import { useNavigate } from 'react-router-dom';
import ProfileAvatar from '../../../components/ProfileAvatar';

interface FollowListProfileProps {
    user: UserMinimal;
    viewedUserId: string;
    hideFollowButton?: boolean;
    setCount: (callback: (data: number) => number) => void;
}

const FollowListProfile = React.forwardRef(({ user, viewedUserId, setCount, hideFollowButton = false }: FollowListProfileProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { sendJsonRequest } = useApi();
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
            data = await sendJsonRequest(`/Profile/Follow`, "POST", { userId: user.id });
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
            data = await sendJsonRequest(`/Profile/Unfollow`, "POST", { userId: user.id });
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
        <div className="d-flex justify-content-between">
            <div className='d-flex align-items-start gap-2'>
                <div className="wb-p-follow-item__avatar">
                    <ProfileAvatar size={42} avatarImage={user.avatar} />
                </div>
                <div className='d-flex flex-column gap-1'>
                    <ProfileName userId={user.id} userName={user.name} />
                    <div>
                        {
                            user.countryCode &&
                            <>
                                {<Country country={countries.find(country => country.code === user.countryCode)!} />}
                                <span className="mx-2">·</span>
                            </>
                        }
                    </div>
                </div>
            </div>
            {
                userInfo && !hideFollowButton &&
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
    )
    const content = ref ?
        <div ref={ref}>{body}</div>
        :
        <div>{body}</div>
    return content
})

export default FollowListProfile