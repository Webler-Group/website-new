import React, { useState } from 'react'
import { UserMinimal } from '../pages/Profile'
import Country from '../../../components/Country';
import countries from '../../../config/countries';
import { Button } from 'react-bootstrap';
import ApiCommunication from '../../../app/apiCommunication';
import { useAuth } from '../../auth/context/authContext';
import { Link } from 'react-router-dom';

interface FollowListProfileProps {
    user: UserMinimal;
}

const FollowListProfile = React.forwardRef(({ user }: FollowListProfileProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const [followLoading, setFollowLoading] = useState(false);
    const [following, setFollowing] = useState(user.isFollowing);
    const { userInfo } = useAuth();

    const handleFollow = async () => {
        setFollowLoading(true);
        let data = null;
        try {
            data = await ApiCommunication.sendJsonRequest(`/Profile/Follow/${user.id}`, "POST");
        }
        catch (err) { }
        if (data && data.success) {
            setFollowing(true);
        }
        setFollowLoading(false);
    }

    const handleUnfollow = async () => {
        setFollowLoading(true);
        let data = null;
        try {
            data = await ApiCommunication.sendJsonRequest(`/Profile/Unfollow/${user.id}`, "POST");
        }
        catch (err) { }
        if (data && data.success) {
            setFollowing(false);
        }
        setFollowLoading(false);
    }

    const body = (
        <div className="d-flex">
            <div className="wb-p-follow-item__avatar">
                <img className="wb-p-follow-item__avatar-image" src="/resources/images/user.svg" />
            </div>
            <div>
                <Link to={"/Profile/" + user.id} className="wb-p-follow-item__name">{user.name}</Link>
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
                <div>
                    {
                        userInfo?.id != user.id && (
                            following ?
                                <Button variant="secondary" size="sm" onClick={handleUnfollow} disabled={followLoading}>Following</Button>
                                :
                                <Button variant="primary" size="sm" onClick={handleFollow} disabled={followLoading}>Follow</Button>
                        )
                    }
                </div>
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