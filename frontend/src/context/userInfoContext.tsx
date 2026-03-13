import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useApi } from "./apiCommunication";
import { useWS } from "./wsCommunication";
import { ChannelDeletedData, InviteCanceledData, MessagesSeenData, NewInviteData, NewMessageInfo, UnseenMessagesCountData } from "../features/channels/types";
import { useAuth } from "../features/auth/context/authContext";
import { UnseenNotificationsData } from "../features/profile/types";

interface UserInfoContextType {
    unseenNotificationsCount: number;
    unseenMessagesCount: number;
    setUnseenNotificationsCount: React.Dispatch<React.SetStateAction<number>>;
}

const UserInfoContext = createContext<UserInfoContextType | null>(null);

const UserInfoProvider = ({ children }: { children: ReactNode }) => {
    const { userInfo } = useAuth();
    const { sendJsonRequest } = useApi();
    const { socket } = useWS();
    const [unseenNotificationsCount, setUnseenNotificationsCount] = useState(0);
    const [unseenChannelIds, setUnseenChannelIds] = useState<string[]>([]);

    const unseenMessagesCount = unseenChannelIds.length;

    useEffect(() => {
        if(!userInfo) return;

        const fetchCounts = async () => {
            const [notificationsResult, messagesResult] = await Promise.all([
                sendJsonRequest<UnseenNotificationsData>("/Profile/GetUnseenNotificationCount", "POST", {}),
                sendJsonRequest<UnseenMessagesCountData>("/Channels/GetUnseenMessagesCount", "POST", {}),
            ]);

            if (notificationsResult.data) {
                setUnseenNotificationsCount(notificationsResult.data.count);
            }
            if (messagesResult.data) {
                setUnseenChannelIds(messagesResult.data.channelIds);
            }
        };

        fetchCounts();
    }, [userInfo]);

    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = () => setUnseenNotificationsCount((prev) => prev + 1);
        const handleDeletedNotification = () => setUnseenNotificationsCount((prev) => prev - 1);

        const handleNewMessage = (data: NewMessageInfo) => setUnseenChannelIds((prev) => prev.includes(data.channelId) ? prev : [...prev, data.channelId]);
        const handleMessagesSeen = (data: MessagesSeenData) => setUnseenChannelIds((prev) => prev.filter(id => id !== data.channelId));
        const handleNewInvite = (data: NewInviteData) => setUnseenChannelIds((prev) => prev.includes(data.invite.channel.id) ? prev : [...prev, data.invite.channel.id]);
        const handleInviteCanceled = (data: InviteCanceledData) => setUnseenChannelIds((prev) => prev.filter(id => id !== data.inviteId));
        const handleChannelDeleted = (data: ChannelDeletedData) => setUnseenChannelIds((prev) => prev.filter(id => id !== data.channelId));

        socket.on("notification:new", handleNewNotification);
        socket.on("notification:deleted", handleDeletedNotification);
        socket.on("channels:new_message_info", handleNewMessage);
        socket.on("channels:messages_seen", handleMessagesSeen);
        socket.on("channels:new_invite", handleNewInvite);
        socket.on("channels:invite_canceled", handleInviteCanceled);
        socket.on("channels:channel_deleted", handleChannelDeleted);

        return () => {
            socket.off("notification:new", handleNewNotification);
            socket.off("notification:deleted", handleDeletedNotification);
            socket.off("channels:new_message_info", handleNewMessage);
            socket.on("channels:messages_seen", handleMessagesSeen);
            socket.off("channels:new_invite", handleNewInvite);
            socket.off("channels:invite_canceled", handleInviteCanceled);
            socket.off("channels:channel_deleted", handleChannelDeleted);
        };
    }, [socket]);

    return (
        <UserInfoContext.Provider value={{
            unseenNotificationsCount,
            unseenMessagesCount,
            setUnseenNotificationsCount
        }}>
            {children}
        </UserInfoContext.Provider>
    );
};

export const useUserInfo = () => {
    const ctx = useContext(UserInfoContext);
    if (!ctx) throw new Error("useUserInfo must be used within UserInfoProvider");
    return ctx;
};

export default UserInfoProvider;