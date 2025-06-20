import React, { MouseEvent, useEffect, useState } from "react";
import { UserMinimal } from "../pages/Profile";
import DateUtils from "../../../utils/DateUtils";
import ProfileName from "../../../components/ProfileName";
import { FaCircle } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import {useApi} from "../../../context/apiCommunication";
import ProfileAvatar from "../../../components/ProfileAvatar";

interface INotification {
    id: string;
    type: number;
    message: string;
    date: string;
    user: UserMinimal;
    actionUser: UserMinimal;
    questionId: string;
    postId: string;
    post: {
        parentId: string | null;
    }
    codeId: string;
    isClicked: boolean;
}

interface NotificationProps {
    notification: INotification;
    onClose: () => void;
    onView: () => void;
}

const Notification = React.forwardRef(({ notification, onClose, onView }: NotificationProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { sendJsonRequest } = useApi();
    const navigate = useNavigate();
    const [seen, setSeen] = useState(notification.isClicked);

    useEffect(() => {
        setSeen(notification.isClicked)
    }, [notification]);

    const viewNotification = async (e: MouseEvent) => {
        onClose()

        if((e.target as HTMLElement).closest("a")) {
            return;
        }
        if (seen === false) {
            await sendJsonRequest("/Profile/MarkNotificationsClicked", "POST", { ids: [notification.id] })
            setSeen(true);
            onView();
        }
        const link = {
            to: "/",
            state: {}
        }
        switch (notification.type) {
            case 101:
                link.to = "/Profile/" + notification.actionUser.id;
                break;
            case 201:
                link.to = "/Discuss/" + notification.questionId;
                link.state = { postId: notification.postId };
                break;
            case 202:
                link.to = "/Compiler-Playground/" + notification.codeId;
                link.state = { postId: notification.postId, isReply: notification.post.parentId !== null };
                break;
        }
        navigate(link.to, { state: link.state })
    }

    const messageParts = notification.message.split("{action_user}");

    const body = (
        <div className="d-flex p-2 border-bottom gap-2" onClick={viewNotification} style={{ cursor: "pointer" }}>
            <div className="wb-p-follow-item__avatar">
                <ProfileAvatar size={42} avatarImage={notification.actionUser.avatar} />
            </div>
            <div className="flex-grow-1">
                <div style={{ wordBreak: "break-word", fontSize: "14px" }}>
                    {messageParts[0]}
                    <ProfileName userId={notification.actionUser.id} userName={notification.actionUser.name} />
                    {messageParts[1]}
                </div>
                <div className="d-flex gap-2">
                    <small className="text-secondary">{DateUtils.format2(new Date(notification.date))}</small>
                    {
                        seen === false &&
                        <small className="text-info">
                            <FaCircle />
                        </small>
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

export type {
    INotification
}

export default Notification