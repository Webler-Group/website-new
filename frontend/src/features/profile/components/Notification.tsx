import React, { MouseEvent, useEffect, useState } from "react";
import DateUtils from "../../../utils/DateUtils";
import ProfileName from "../../../components/ProfileName";
import { FaCircle } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../../context/apiCommunication";
import ProfileAvatar from "../../../components/ProfileAvatar";
import { NotificationDetails } from "../types";
import NotificationTypeEnum from "../../../data/NotificationTypeEnum";

interface NotificationProps {
    notification: NotificationDetails;
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

        if ((e.target as HTMLElement).closest("a")) {
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
            case NotificationTypeEnum.PROFILE_FOLLOW:
                link.to = "/Profile/" + notification.actionUser.id;
                break;
            case NotificationTypeEnum.QA_ANSWER:
                link.to = "/Discuss/" + notification.questionId;
                link.state = { postId: notification.postId };
                break;
            case NotificationTypeEnum.CODE_COMMENT:
            case NotificationTypeEnum.CODE_COMMENT_MENTION:
                link.to = "/Compiler-Playground/" + notification.codeId;
                link.state = { postId: notification.postId, isReply: notification.postParentId !== null };
                break;
            case NotificationTypeEnum.QA_QUESTION_MENTION:
            case NotificationTypeEnum.QA_ANSWER_MENTION:
                link.to = "/Discuss/" + notification.questionId;
                link.state = { postId: notification.postId, isReply: notification.postParentId !== null };
                break;
            case NotificationTypeEnum.FEED_FOLLOWER_POST:
            case NotificationTypeEnum.FEED_SHARE:
            case NotificationTypeEnum.FEED_PIN:
                link.to = "/Feed/" + notification.feedId;
                break;
            case NotificationTypeEnum.FEED_COMMENT:
            case NotificationTypeEnum.FEED_COMMENT_MENTION:
                link.to = "/Feed/" + notification.feedId;
                link.state = { postId: notification.postId, isReply: notification.postParentId != null }
                break;
            case NotificationTypeEnum.LESSON_COMMENT:
            case NotificationTypeEnum.LESSON_COMMENT_MENTION:
                link.to = "/Courses/" + notification.courseCode + "/Lesson/" + notification.lessonId;
                link.state = { postId: notification.postId, isReply: notification.postParentId != null }
                break;
            case NotificationTypeEnum.CHANNELS:
                link.to = "/Channels";
                break;
        }
        navigate(link.to, { state: link.state })
    }

    const messageParts = notification.message.split("{action_user}");

    const body = (
        <div className="d-flex p-2 border-bottom gap-2 align-items-center" onClick={viewNotification} style={{ cursor: "pointer" }}>
            <div>
                <ProfileAvatar size={32} avatarUrl={notification.actionUser.avatarUrl} />
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

    return content;
});

export default Notification