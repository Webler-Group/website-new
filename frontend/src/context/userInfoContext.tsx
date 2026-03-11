import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useApi } from "./apiCommunication";
import { useWS } from "./wsCommunication";
import { UnseenMessagesCountData } from "../features/channels/types";

interface UserInfoContextType {
    unseenNotificationsCount: number;
    unseenMessagesCount: number;
    setUnseenNotificationsCount: React.Dispatch<React.SetStateAction<number>>;
    setUnseenMessagesCount: React.Dispatch<React.SetStateAction<number>>;
}

const UserInfoContext = createContext<UserInfoContextType | null>(null);

const UserInfoProvider = ({ children }: { children: ReactNode }) => {
    const { sendJsonRequest } = useApi();
    const { socket } = useWS();
    const [unseenNotificationsCount, setUnseenNotificationsCount] = useState(0);
    const [unseenMessagesCount, setUnseenMessagesCount] = useState(0);

    useEffect(() => {
        const fetchCounts = async () => {
            const [notificationsResult, messagesResult] = await Promise.all([
                sendJsonRequest<UnseenMessagesCountData>("/Profile/GetUnseenNotificationCount", "POST", {}),
                sendJsonRequest<UnseenMessagesCountData>("/Channels/GetUnseenMessagesCount", "POST", {}),
            ]);

            if (notificationsResult.data) {
                setUnseenNotificationsCount(notificationsResult.data.count);
            }
            if (messagesResult.data) {
                setUnseenMessagesCount(messagesResult.data.count);
            }
        };

        fetchCounts();
    }, []);

    // Socket listeners for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = () => setUnseenNotificationsCount((prev) => prev + 1);
        const handleDeletedNotification = () => setUnseenNotificationsCount((prev) => prev - 1);

        const handleNewMessage = () => setUnseenMessagesCount((prev) => prev + 1);
        const handleNewInvite = () => setUnseenMessagesCount((prev) => prev + 1);
        const handleInviteCanceled = () => setUnseenMessagesCount((prev) => prev - 1);

        socket.on("notification:new", handleNewNotification);
        socket.on("notification:deleted", handleDeletedNotification);
        socket.on("channels:new_message_info", handleNewMessage);
        socket.on("channels:new_invite", handleNewInvite);
        socket.on("channels:invite_canceled", handleInviteCanceled);

        return () => {
            socket.off("notification:new", handleNewNotification);
            socket.off("notification:deleted", handleDeletedNotification);
            socket.off("channels:new_message_info", handleNewMessage);
            socket.off("channels:new_invite", handleNewInvite);
            socket.off("channels:invite_canceled", handleInviteCanceled);
        };
    }, [socket]);

    return (
        <UserInfoContext.Provider value={{
            unseenNotificationsCount,
            unseenMessagesCount,
            setUnseenNotificationsCount,
            setUnseenMessagesCount,
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