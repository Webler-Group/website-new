import { Alert, Button, Form } from "react-bootstrap";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { ChangeEvent, useState, useEffect } from "react";
import ToggleSwitch from "../../../components/ToggleSwitch";
import { useApi } from "../../../context/apiCommunication";
import { IUserNotifications } from "../pages/Profile";

interface PushNotificationsTabProps {
    userId: string;
    userNotifications: IUserNotifications;
    onUpdate: (newValue: IUserNotifications) => void;
}

const PushNotificationsTab = ({ userId, userNotifications, onUpdate }: PushNotificationsTabProps) => {
    const { subscribed, error, subscribe, unsubscribe } = usePushNotifications();
    const [notifications, setNotifications] = useState<IUserNotifications>(userNotifications);
    const [loading, setLoading] = useState(false);
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

    const handleCategoryChange = (category: string) => {
        setNotifications((prev: any) => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const handleSaveNotificationSettings = async () => {
        setLoading(true);
        const result = await sendJsonRequest("/Profile/UpdateNotifications", "POST", {
            notifications: notifications
        });
        if(result && result.success) {
            onUpdate(result.data.notifications);
        }
        setLoading(false);
    }

    return (
        <div className="mt-3">
            {error && <Alert variant="danger" dismissible>{error}</Alert>}

            <div className="d-flex align-items-center mb-3">
                <span className="me-3">Enabled</span>
                <ToggleSwitch
                    value={subscribed}
                    onChange={handleToggle}
                    disabled={loading}
                />
            </div>

            {subscribed && (
                <Form>
                    {Object.keys(userNotifications).map(category => (
                        <Form.Check 
                            key={category}
                            type="checkbox"
                            id={`notification-${category}`}
                            label={category}
                            checked={notifications[category as keyof IUserNotifications]}
                            onChange={() => handleCategoryChange(category)}
                            className="mb-2"
                        />
                    ))}
                    <Button
                        variant="primary"
                        onClick={handleSaveNotificationSettings}
                        disabled={loading}
                    >
                        Save
                    </Button>
                </Form>
            )}
        </div>
    );
};

export default PushNotificationsTab;