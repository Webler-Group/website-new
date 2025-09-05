// ReactionListItem.tsx
import React, { useState } from "react";
import { useAuth } from "../../features/auth/context/authContext";
import { useApi } from "../../context/apiCommunication";
import { ReactionsEnum, reactionsInfo } from "../../data/reactions";
import ProfileAvatar from "../../components/ProfileAvatar";
import ProfileName from "../../components/ProfileName";

interface IUserReaction {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    isFollowing: boolean;
    reaction: ReactionsEnum;
}

interface ReactionListItemProps {
    item: IUserReaction;
    showReactions: boolean;
}

const ReactionListItem = React.forwardRef<HTMLDivElement, ReactionListItemProps>(
    ({ item, showReactions }, ref) => {
        const { sendJsonRequest } = useApi();
        const [followLoading, setFollowLoading] = useState(false);
        const [following, setFollowing] = useState(item.isFollowing);
        const { userInfo } = useAuth();

        const handleFollow = async () => {
            if (!userInfo) return;
            setFollowLoading(true);
            const result = await sendJsonRequest(`/Profile/Follow`, "POST", { userId: item.userId });
            if (result && result.success) setFollowing(true);
            setFollowLoading(false);
        };

        const handleUnfollow = async () => {
            if (!userInfo) return;
            setFollowLoading(true);
            const result = await sendJsonRequest(`/Profile/Unfollow`, "POST", { userId: item.userId });
            if (result && result.success) setFollowing(false);
            setFollowLoading(false);
        };

        const reactionInfo = reactionsInfo[item.reaction];

        const body = (
            <div className="d-flex justify-content-between align-items-start py-2 border-bottom">
                <div className="d-flex align-items-start">
                    {/* Avatar */}
                    <div className="me-2">
                        <ProfileAvatar size={42} avatarImage={item.userAvatar ?? null} />
                    </div>

                    {/* Name and Reaction */}
                    <div className="d-flex flex-column">
                        <ProfileName userId={item.userId} userName={item.userName} />
                        {showReactions && (
                            <div className="mt-1 d-flex align-items-center" title={reactionInfo.label}>
                                <span className="me-1">
                                    {reactionInfo.emoji}
                                </span>
                                <span
                                    style={{
                                        fontSize: "15px",
                                        color: reactionInfo.color,
                                        fontWeight: 600
                                    }}
                                >
                                    {reactionInfo.label}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Follow/Unfollow Button */}
                {userInfo && userInfo.id !== item.userId && (
                    following ? (
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            disabled={followLoading}
                            onClick={handleUnfollow}
                        >
                            Unfollow
                        </button>
                    ) : (
                        <button
                            className="btn btn-primary btn-sm"
                            disabled={followLoading}
                            onClick={handleFollow}
                        >
                            Follow
                        </button>
                    )
                )}
            </div>
        );

        return ref ? <div ref={ref}>{body}</div> : <div>{body}</div>;
    }
);

export type { IUserReaction };

export default ReactionListItem;
