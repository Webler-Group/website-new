import { SyntheticEvent, useEffect, useState } from "react"
import DatabaseClient from "../../../../api/DatabaseClient";
import Message from "../views/Message";
import UserMinimal from "../../../account-profile/views/UserMinimal";
import { useAuth } from "../../../../context/AuthContext";
import EditChat from "./EditChat";
import Conversation from "../views/Conversation";
import Loader from "../../../../partials/Loader";
import GifSearchBar from "./GifSearchBar";
import ChatMessage from "./ChatMessage";


function Chat({ conversation }: any) {

    const [conversationFull, setConversationFull] = useState<any>()
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const { getUserDetails } = useAuth()
    const [sendButtonDisabled, setSendButtonDisabled] = useState(true)
    const [gifSearchBarHidden, setGifSearchBarHidden] = useState(true)
    const [keepingCurrent, setKeepingCurrent] = useState(true)

    const scrollToBottom = (forced = false) => {
        const messageBox = document.getElementById("message-box") as HTMLElement
        if (messageBox && (keepingCurrent || forced)) {
            messageBox.scrollTop = messageBox.scrollHeight - messageBox.clientHeight;
        }
    }

    useEffect(() => {
        scrollToBottom();
        DatabaseClient.updateLastReadMessage(getUserDetails().uid, conversation.id, Date.now())
            .catch(err => console.log(err));
    }, [messages])

    useEffect(() => {
        let text = message.trim()
        setSendButtonDisabled(text.length == 0 || text.length > 240)
    }, [message])


    useEffect(() => {

        setMessage('')
        setGifSearchBarHidden(true)
        closeSettingBar()

        let unsubscribe1 = () => {}
        let unsubscribe2 = () => {}
        if (conversation) {

            unsubscribe1 = DatabaseClient.onMessages(conversation.id, 100, (snapshot) => {
                if (snapshot.exists()) {
                    const data = Object.values(snapshot.val()) as Message[]
                    setMessages(data);

                }
                else {
                    setMessages([])
                }
            })

            unsubscribe2 = DatabaseClient.onConversationChange(conversation.id, (snapshot) => {
                const data = snapshot.val();
                const conversationFull = new Conversation(data.id, data.title, data.isGroup, data.ownerId) as any

                let promises = []
                for (let participantId in data.participants) {
                    promises.push(DatabaseClient.getUser(participantId).then(snapshot => {
                        const user = snapshot.val();
                        conversationFull.participants.push(user)
                    }))
                }
                Promise.all(promises)
                    .then(() => setConversationFull(conversationFull))
            })
        }
        else {
            setMessages([])
            setConversationFull(null)
        }


        return () => {
            unsubscribe1()
            unsubscribe2()
        }

    }, [conversation])

    async function handleSendMessage(e: SyntheticEvent) {
        e.preventDefault();

        setSendButtonDisabled(true)

        let text = message
        text = text.trim()

        try {
            const userDetails = getUserDetails()
            const user = new UserMinimal(userDetails.uid, userDetails.username, userDetails.avatarUrl)

            await DatabaseClient.createMessage(conversation.id, user, text)

            scrollToBottom(true)
            setMessage('')
        }
        catch (err) {
            console.log(err);
        }

        setSendButtonDisabled(false)
    }

    function closeSettingBar() {
        document.getElementById("setting-bar")?.classList.add("chat-setting-bar-closed")
    }

    function toggleSettingBar() {
        document.getElementById("setting-bar")?.classList.toggle("chat-setting-bar-closed")
    }

    function onMessageInputChange(e: SyntheticEvent) {
        let value = (e.target as HTMLTextAreaElement).value
        setMessage(value)
    }

    function toggleGifSearchBar() {
        setGifSearchBarHidden(!gifSearchBarHidden)
    }

    function handleOnSelectGif(item: any) {

        let text = item["media"][0]["tinygif"]["url"]

        const userDetails = getUserDetails()
        const user = new UserMinimal(userDetails.uid, userDetails.username, userDetails.avatarUrl)

        setGifSearchBarHidden(true)

        DatabaseClient.createMessage(conversation.id, user, text)
            .then(() => {
                scrollToBottom(true)
            })
            .catch(err => {
                console.log(err);
            })

    }

    function onScroll(e: SyntheticEvent) {
        const elem = (e.target as HTMLElement)
        
        setKeepingCurrent(elem.scrollTop >= elem.scrollHeight - elem.clientHeight - 2)
    }

    return (
        <>
            {
                conversationFull ?
                    <div className="w-100 h-100 bg-light p-0 d-flex flex-column" style={{height:"inherit", width:"inherit"}}>
                        <div className="w-100 bg-white border-bottom" style={{ height: "60px", zIndex: 2, position: "relative", backgroundColor: "var(--bGcolor)" }} >
                            <div className="d-flex justify-content-between align-items-center p-2 w-100" style={{ background: "var(--navBarBgColor)" }}>
                                <div>
                                    <h3>{conversationFull.title}</h3>
                                </div>
                                <div>
                                    <button onClick={toggleSettingBar} className="btn">
                                        <i className="fa fa-gear" style={{ color: "var(--fontColor)" }}></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div id="setting-bar" className="chat-setting-bar chat-setting-bar-closed" style={{ backgroundColor: "var(--authFormBGcolor)", zIndex: 1}}>
                            <EditChat conversation={conversationFull} />
                        </div>
                        <div id="message-box" onScroll={onScroll} className="d-flex flex-column message-box p-2" style={{ flexGrow: 1, overflowY: "scroll", backgroundColor: "var(--bGcolor)" }}>
                            {
                                messages.map((item, key) => (
                                    <ChatMessage item={item} key={key} scrollToBottom={scrollToBottom} />
                                ))
                            }
                        </div>
                        <div className="p-2" style={{ height: "75px", backgroundColor: "var(--footerColor)" }}>
                            <div hidden={gifSearchBarHidden} style={{ position: "absolute", left: "0", transform: "translate(0, -100%)", width: "100%", maxWidth: "600px", height: "70%" }}>
                                <GifSearchBar onSelect={handleOnSelectGif} />
                            </div>
                            <div hidden={keepingCurrent} style={{ position: "absolute", right: "0", transform: "translate(0, -100%)" }}>
                                <button onClick={() => scrollToBottom(true)} className="quick-scroll-button-chat" style={{ display: "block" }}>
                                    <i className="fa fa-arrow-down"></i>
                                    Jump to present
                                </button>
                            </div>
                            <form onSubmit={handleSendMessage} id="messageForm" className="w-100 h-100 d-flex p-2 rounded mt-2" style={{ gap: 6, backgroundColor: "var(--footerColor)" }}>
                                <button onClick={toggleGifSearchBar} className="btn btn-primary" type="button">
                                    GIF
                                </button>
                                <textarea className="p-2 rounded" value={message} onChange={onMessageInputChange} style={{ border: "none", outline: "none", flexGrow: 1, resize: "none", backgroundColor: "var(--bGcolor)", color: "var(--fontColor)", width:"95%" }} placeholder="Enter message here"></textarea>
                                <button hidden={sendButtonDisabled} className="btn btn-primary" type="submit">
                                    <i className="fa fa-paper-plane"></i>
                                </button>
                            </form>
                        </div>
                    </div>
                    :
                    <Loader />
            }
        </>
    )
}

export default Chat