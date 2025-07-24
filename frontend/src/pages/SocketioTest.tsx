import { useEffect } from "react";
import { Button } from "react-bootstrap";
import { io } from "socket.io-client";

const socket = io('http://localhost:5500');

const SocketioTest = () => {
    useEffect(() => {
        socket.on('chat message', (msg) => {
            console.log('Received chat:', msg);
        });

        socket.on('notification', (notif) => {
            console.log('Notification:', notif);
        });

        return () => {
            socket.off('chat message');
            socket.off('notification');
        };
    }, []);

    const sendMessage = () => {
        socket.emit('chat message', { user: 'Alice', text: 'Hello!' });
    };

    return (
        <div className="p-2" style={{ minHeight: "100vh" }}>
            <Button onClick={sendMessage}>Send Chat</Button>
        </div>
    );
}

export default SocketioTest;