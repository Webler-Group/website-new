import { Alert, Button, Form } from "react-bootstrap";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { ChangeEvent, useState, useEffect } from "react";
import ToggleSwitch from "../../../components/ToggleSwitch";
import { useApi } from "../../../context/apiCommunication";
import NotificationTypeEnum from "../../../data/NotificationTypeEnum";
import RequestResultAlert from "../../../components/RequestResultAlert";
import { NotificationSettings, UpdateNotificationsData } from "../types";

const notificationInfo: { type: string; field: keyof NotificationSettings; value: NotificationTypeEnum }[] = [
    { type: "profile follow", field: "profileFollow", value: NotificationTypeEnum.PROFILE_FOLLOW },
    { type: "QA answer", field: "qaAnswer", value: NotificationTypeEnum.QA_ANSWER },
    { type: "code comment", field: "codeComment", value: NotificationTypeEnum.CODE_COMMENT },
    { type: "QA question mention", field: "qaQuestionMention", value: NotificationTypeEnum.QA_QUESTION_MENTION },
    { type: "QA answer mention", field: "qaAnswerMention", value: NotificationTypeEnum.QA_ANSWER_MENTION },
    { type: "code comment mention", field: "codeCommentMention", value: NotificationTypeEnum.CODE_COMMENT_MENTION },
    { type: "feed follower post", field: "feedFollowerPost", value: NotificationTypeEnum.FEED_FOLLOWER_POST },
    { type: "feed comment", field: "feedComment", value: NotificationTypeEnum.FEED_COMMENT },
    { type: "feed share", field: "feedShare", value: NotificationTypeEnum.FEED_SHARE },
    { type: "feed pin", field: "feedPin", value: NotificationTypeEnum.FEED_PIN },
    { type: "feed comment mention", field: "feedCommentMention", value: NotificationTypeEnum.FEED_COMMENT_MENTION },
    { type: "lesson comment", field: "lessonComment", value: NotificationTypeEnum.LESSON_COMMENT },
    { type: "lesson comment mention", field: "lessonCommentMention", value: NotificationTypeEnum.LESSON_COMMENT_MENTION },
    { type: "channels", field: "channels", value: NotificationTypeEnum.CHANNELS },
];

const defaultNotifications: NotificationSettings = {
    profileFollow: true,
    qaAnswer: true,
    codeComment: true,
    qaQuestionMention: true,
    qaAnswerMention: true,
    codeCommentMention: true,
    feedFollowerPost: true,
    feedComment: true,
    feedShare: true,
    feedPin: true,
    feedCommentMention: true,
    lessonComment: true,
    lessonCommentMention: true,
    channels: true,
};

const buildFullNotifications = (partial: Partial<NotificationSettings>): NotificationSettings => ({
    ...defaultNotifications,
    ...partial,
} as NotificationSettings);

interface NotificationsTabProps {
    userId: string;
    userNotifications: Partial<NotificationSettings>;
    onUpdate: (newValue: NotificationSettings) => void;
}

const NotificationsTab = ({ userId, userNotifications, onUpdate }: NotificationsTabProps) => {
    const { subscribed, error, subscribe, unsubscribe } = usePushNotifications();
    const [notifications, setNotifications] = useState<NotificationSettings>(
        buildFullNotifications(userNotifications)
    );
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ message?: string; errors?: { message: string }[] }>({});
    const { sendJsonRequest } = useApi();

    useEffect(() => {
        setNotifications(buildFullNotifications(userNotifications));
    }, [userNotifications]);

    const handleToggle = async (e: ChangeEvent) => {
        if (!userId) return;
        setLoading(true);
        if ((e.target as HTMLInputElement).checked) {
            await subscribe();
        } else {
            await unsubscribe();
        }
        setLoading(false);
    };

    const handleCategoryChange = (field: keyof NotificationSettings) => {
        setNotifications(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSaveNotificationSettings = async () => {
        setLoading(true);
        setMessage({});

        const result = await sendJsonRequest<UpdateNotificationsData>("/Profile/UpdateNotifications", "POST", {
            notifications: notificationInfo.map(item => ({ type: item.value, enabled: notifications[item.field] }))
        });

        if (result.data) {
            onUpdate(result.data.notifications);
            setMessage({ message: "Notification settings saved successfully" });
        } else {
            setMessage({ errors: result.error });
        }

        setLoading(false);
    };

    return (
        <div className="mt-3">
            {error && <Alert variant="danger" dismissible>{error}</Alert>}
            <RequestResultAlert errors={message.errors} message={message.message} />
            <Form>
                <div className="d-flex flex-column">
                    {notificationInfo.map(item => (
                        <div key={item.value} className="me-3 mb-2">
                            <Form.Check
                                type="checkbox"
                                id={`notification-${item.value}`}
                                label={item.type}
                                checked={notifications[item.field]}
                                onChange={() => handleCategoryChange(item.field)}
                            />
                        </div>
                    ))}
                </div>

                <Button
                    variant="primary"
                    onClick={handleSaveNotificationSettings}
                    disabled={loading}
                    className="mt-3"
                >
                    Save
                </Button>
            </Form>

            <div className="d-flex align-items-center mt-4">
                <span className="me-3">Push Notifications</span>
                <ToggleSwitch
                    value={subscribed}
                    onChange={handleToggle}
                    disabled={loading}
                />
            </div>
        </div>
    );
};

export default NotificationsTab;