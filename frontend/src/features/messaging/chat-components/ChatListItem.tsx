import { useEffect, useState } from "react";
import DatabaseClient from "../../../api/DatabaseClient";
import Message from "../views/Message";

function ChatListItem({ item, onClick }: any) {

    const [lastMessage, setLastMessage] = useState<Message>()

    useEffect(() => {
        DatabaseClient.onMessages(item.id, 1, (snapshot) => {
            if (snapshot.exists()) {
                const data = Object.values(snapshot.val())[0]
                const message = data as Message
                setLastMessage(message)
            }
           
        })
    }, [])

    return (
        <div className="w-100 p-2 border-bottom  d-flex flex-column" style={{ cursor: "pointer" }} onClick={onClick}>
            <h4>{item.isGroup ? item.title : "___"}</h4>
            <div>
                {
                    (lastMessage && item.lastReadMessageTimestamp < lastMessage.timestamp) &&
                    <small className="bg-info text-white" style={{ borderRadius: "12px", padding: "2px 6px", marginRight: "4px" }}>new</small>
                }
                {
                    lastMessage ?
                        <span>
                            { lastMessage.user && <b>{lastMessage.user.username}: </b>  }
                            {lastMessage.text.length < 16 ? lastMessage.text : lastMessage.text.slice(0, 16) + "…"}</span>
                        :
                        <i>No messages yet</i>
                }
            </div>
        </div>
    )
}

export default ChatListItem