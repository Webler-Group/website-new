import { useCallback, useEffect, useRef, useState } from "react"
import { Badge, Dropdown } from "react-bootstrap"
import EllipsisDropdownToggle from "../../../components/EllipsisDropdownToggle"
import { FaBell } from "react-icons/fa6"
import Notification from "../components/Notification"
import useNotifications from "../hooks/useNotifications"
import { useApi } from "../../../context/apiCommunication"
import { useWS } from "../../../context/wsCommunication"

const NotificationList = () => {
    const { sendJsonRequest } = useApi();
    const [prevId, setPrevId] = useState<string | null>(null);
    const [opened, setOpened] = useState(false);
    const {
        isLoading,
        error,
        results,
        hasNextPage,
        onMarkAllAsRead
    } = useNotifications(20, prevId, opened);
    const [unseenCount, setUnseenCount] = useState(0);
    const { socket } = useWS();

    useEffect(() => {
        getUnseenNotificationCount();

        if (!socket) return;

        const handleNotification = () => {
            setUnseenCount((prev) => prev + 1);
        };

        socket.on("notification:new", handleNotification);

        return () => {
            socket.off("notification:new", handleNotification);
        };
    }, [socket]);

    const getUnseenNotificationCount = async () => {
        const result = await sendJsonRequest("/Profile/GetUnseenNotificationCount", "POST", {});
        if (result && result.count !== undefined) {
            setUnseenCount(result.count);
        }
    }

    const markAllAsRead = async () => {
        await sendJsonRequest("/Profile/MarkNotificationsClicked", "POST", {});
        setUnseenCount(0);
        onMarkAllAsRead();
    }

    const intObserver = useRef<IntersectionObserver>()
    const lastProfileRef = useCallback((profile: any) => {
        if (isLoading) return

        if (intObserver.current) intObserver.current.disconnect()

        intObserver.current = new IntersectionObserver(profiles => {

            if (profiles[0].isIntersecting && hasNextPage) {

                setPrevId(results[results.length - 1].id)
            }
        })


        if (profile) intObserver.current.observe(profile)
    }, [isLoading, hasNextPage])

    const handleNotificationListToggle = (visible: boolean) => {
        setOpened(visible);
        if (visible) {
            setPrevId(null)
        }
    }

    const content = results.length > 0 ?
        results.map((notification, i) => {

            if (results.length === i + 1) {
                return <Notification ref={lastProfileRef} key={notification.id} notification={notification} onClose={() => setOpened(false)} onView={() => setUnseenCount(cout => cout - 1)} />
            }
            return <Notification key={notification.id} notification={notification} onClose={() => setOpened(false)} onView={() => setUnseenCount(cout => cout - 1)} />
        })
        :
        <div className="text-center my-4">
            <p>You have no notifications</p>
        </div>

    return (
        <Dropdown show={opened} onToggle={handleNotificationListToggle} autoClose="outside" align={{ lg: "start" }} className='ms-1 me-3'>
            <Dropdown.Toggle size='sm'>
                <FaBell />
                {
                    unseenCount > 0 &&
                    <Badge pill bg='danger' className='position-absolute top-0 start-100 translate-middle'>{unseenCount < 100 ? unseenCount.toString() : "99+"}</Badge>
                }
            </Dropdown.Toggle>
            <Dropdown.Menu style={{ boxShadow: "0px 0px 8px rgba(0,0,0,.5)", borderRadius: "6px" }}>
                <div style={{ width: "calc(100vw - 64px)", maxWidth: "480px", maxHeight: "calc(100dvh - 80px)" }} className="d-flex flex-column">
                    <div className="px-2 border-bottom d-flex justify-content-between">
                        <div>
                            <h4>Notifications</h4>
                        </div>
                        <div>
                            <Dropdown align="end">
                                <Dropdown.Toggle as={EllipsisDropdownToggle}></Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={markAllAsRead}>Mark all as read</Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </div>
                    <div className="overflow-auto">
                        {
                            error ?
                                <p>{error}</p>
                                :
                                <div>
                                    {
                                        content
                                    }
                                </div>
                        }
                    </div>
                </div>
            </Dropdown.Menu>
        </Dropdown>
    )
}

export default NotificationList;