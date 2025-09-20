import { Alert, Button, Form } from "react-bootstrap";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { ChangeEvent, useState, useEffect } from "react";
import ToggleSwitch from "../../../components/ToggleSwitch";
import { useApi } from "../../../context/apiCommunication";
import NotificationTypeEnum from "../../../data/NotificationTypeEnum";
import RequestResultAlert from "../../../components/RequestResultAlert";

const notificationInfo = [
    { type: "profile follow", value: NotificationTypeEnum.PROFILE_FOLLOW },
    { type: "QA answer", value: NotificationTypeEnum.QA_ANSWER },
    { type: "code comment", value: NotificationTypeEnum.CODE_COMMENT },
    { type: "QA question mention", value: NotificationTypeEnum.QA_QUESTION_MENTION },
    { type: "QA answer mention", value: NotificationTypeEnum.QA_ANSWER_MENTION },
    { type: "code comment mention", value: NotificationTypeEnum.CODE_COMMENT_MENTION },
    { type: "feed follower post", value: NotificationTypeEnum.FEED_FOLLOWER_POST },
    { type: "feed comment", value: NotificationTypeEnum.FEED_COMMENT },
    { type: "feed share", value: NotificationTypeEnum.FEED_SHARE },
    { type: "feed pin", value: NotificationTypeEnum.FEED_PIN },
    { type: "feed comment mention", value: NotificationTypeEnum.FEED_COMMENT_MENTION },
    { type: "lesson comment", value: NotificationTypeEnum.LESSON_COMMENT },
    { type: "lesson comment mention", value: NotificationTypeEnum.LESSON_COMMENT_MENTION },
    { type: "channels", value: NotificationTypeEnum.CHANNELS },
] as const;

interface NotificationsTabProps {
    userId: string;
    userNotifications: Record<NotificationTypeEnum, boolean>;
    onUpdate: (newValue: Record<NotificationTypeEnum, boolean>) => void;
}

const NotificationsTab = ({ userId, userNotifications, onUpdate }: NotificationsTabProps) => {
    const { subscribed, error, subscribe, unsubscribe } = usePushNotifications();
    const [notifications, setNotifications] = useState<Record<NotificationTypeEnum, boolean>>(userNotifications);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ message?: string; errors?: any[] }>({});
    const { sendJsonRequest } = useApi();

    useEffect(() => {
        setNotifications(userNotifications);
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

    const handleCategoryChange = (category: NotificationTypeEnum) => {
        setNotifications(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const handleSaveNotificationSettings = async () => {
        setLoading(true);
        setMessage({});

        const result = await sendJsonRequest("/Profile/UpdateNotifications", "POST", {
            notifications: Object.entries(notifications).map(entry => ({ type: Number(entry[0]), enabled: entry[1] }))
        });

        if (result && result.success) {
            onUpdate(result.data.notifications);
            setMessage({ message: "Notification settings saved successfully" });
        } else {
            setMessage({ errors: result?.error });
        }

        setLoading(false);
    }

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
                                checked={notifications[item.value]}
                                onChange={() => handleCategoryChange(item.value)}
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