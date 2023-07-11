import { useState, useEffect, SetStateAction } from "react"
import DatabaseClient from "../../../api/DatabaseClient"
import { useAuth } from "../../../context/AuthContext"

import UserConversation from "../../account-profile/views/UserConversation"
import UserMinimal from "../../account-profile/views/UserMinimal"

import Chat from "./chat-components/Chat"
import ChatListItem from "./chat-components/ChatListItem"
import CreateConversationPopup from "./chat-components/CreateConversationPopup"
import ConversationInvite from "./views/ConversationInvite"

interface Props {
    pageName: string;
}


function Messaging({ pageName }: Props) {

    const { getUserDetails, updateUserDetails, setUserDetails } = useAuth()
    const [conversationList, setConversationList] = useState<UserConversation[]>([])
    const [conversationInvites, setConversationInvites] = useState<any[]>([])
    const [activeConversation, setActiveConversation] = useState<UserConversation>()
    const [createConversationPopupOpened, setCreateConversationPopupOpened] = useState(false)
    const [isFirst, setIsFirst] = useState(true)

    useEffect(() => {

        const unsubscribe1 = DatabaseClient.onUserChange(getUserDetails().uid, (snapshot) => {
            if (snapshot.exists()) {
                const user = snapshot.val()
                setUserDetails(user)
                if (user.conversations) {
                    const data = (Object.values(user.conversations) as UserConversation[]).filter(item => item.id != null)
                    setConversationList(data)
                }
                else {
                    setConversationList([])
                }
            }
        })

        const unsubscribe2 = DatabaseClient.onConversationInvitesChange(getUserDetails().uid, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val()
                let arr: SetStateAction<any[]> = []
                let promises = []
                for (let conversationId in data) {
                    for (let item of Object.values(data[conversationId]) as any[]) {
                        arr.push(item)
                        promises.push(DatabaseClient.getUser(item.inviterId).then(snapshot => {
                            item.inviter = snapshot.val()
                        }))
                    }

                }
                Promise.all(promises)
                    .then(() => setConversationInvites(arr))
            }
            else {
                setConversationInvites([])
            }
        })
        return () => {
            unsubscribe1()
            unsubscribe2()
        }
    }, [])

    useEffect(() => {
        if (isFirst && conversationList.length > 0) {
            setIsFirst(false)
            const userDetails = getUserDetails()
            if (userDetails.activeConversationId) {
                const item = conversationList.find(e => e.id == userDetails.activeConversationId)
                if (item) {
                    setActiveConversation(item)
                }
            }
        }
    }, [conversationList])

    async function handleAcceptInvite(conversationInvite: ConversationInvite) {
        try {
            const userDetails = getUserDetails()
            const user = new UserMinimal(userDetails.uid, userDetails.username, userDetails.avatarUrl)
            await DatabaseClient.addUserToConversation(conversationInvite.conversation, user)
            await DatabaseClient.deleteAllConversationInvites(user.uid, conversationInvite.conversation.id)
            await DatabaseClient.createMessage(conversationInvite.conversation.id, null, `${user.username} entered the conversation`)
        }
        catch (err) {
            console.log(err);
        }
    }

    async function handleDeclineInvite(conversationInvite: ConversationInvite) {
        try {
            const userDetails = getUserDetails()
            const user = new UserMinimal(userDetails.uid, userDetails.username, userDetails.avatarUrl)
            await DatabaseClient.deleteConversationInvite(user.uid, conversationInvite.conversation.id, conversationInvite.id)
        }
        catch (err) {
            console.log(err);
        }
    }

    function closeSidebar() {
        document.getElementById("sidebar")?.classList.add("chat-sidebar-closed")
    }

    function openSidebar() {
        document.getElementById("sidebar")?.classList.remove("chat-sidebar-closed")
    }

    // Dark theme handler  vvvvvv
    const switchIt = () => {
        let body = document.getElementsByTagName("body")[0];
        if (localStorage.getItem("data-theme") === "dark") {
            body.className = "dark";
            return true;
        }
        else if (localStorage.getItem("data-theme") === "light") {
            body.className = "";
            return false;
        }
    }
    useEffect(() => {
        switchIt(); 
    }, []);
    // Dark theme handler   ^^^^^^^^

    return (
        <>
            <div className="" style={{ overflow: "hidden", position: "fixed", width: pageName === "SocialMainPage"?"inherit":"100%", height: pageName === "SocialMainPage"?"80%":"100%", minHeight: "300px" , display:"block"}}>
                {
                    createConversationPopupOpened &&
                    <div className="w-100 h-100 d-flex justify-content-center align-items-center" style={{ position: "absolute", zIndex: "999", background: "rgba(128,128,128,0.5)" }}>
                        <CreateConversationPopup onCancel={() => setCreateConversationPopupOpened(false)} />
                    </div>
                }

                <div className="w-100" style={{ color: "var(--fontColor)", backgroundColor: pageName === "SocialMainPage"?"var(--chatSideBarColor)":"var(--navBarBgColor)", height: "50px", zIndex: 2, position: "relative" }} >
                    <div className="d-flex justify-content-between align-items-center p-2 w-100" >
                        <div>
                            <button onClick={openSidebar} className="btn" style={{ color: "var(--fontColor)", backgroundColor: pageName === "SocialMainPage"?"var(--chatSideBarColor)":"var(--navBarBgColor)" }}>
                                <i className="fa fa-bars"></i>
                            </button>
                        </div>
                        <h4>Chat</h4>
                        {
                            <div className="d-flex" >
                                {
                                    pageName==="SocialMainPage"?
                                        <>
                                            <a href="/messages">
                                                <button className="btn" style={{ color: "var(--fontColor)", backgroundColor: pageName === "SocialMainPage"?"var(--chatSideBarColor)":"var(--navBarBgColor)" }}>
                                                    <i className="fa fa-external-link"></i>
                                                </button>
                                            </a>
                                        </>
                                    :
                                        <>
                                            <button onClick={() => history.back()} className="btn" style={{ color: "var(--fontColor)", backgroundColor: pageName === "SocialMainPage"?"var(--chatSideBarColor)":"var(--navBarBgColor)" }}>
                                                <i className="fa fa-arrow-left"></i><label style={{paddingLeft:"3px",fontSize:"0.7em"}}>Go back</label>
                                            </button>
                                        </>
                                }
                            </div>
                        }
                    </div>
                </div>
                <div id="sidebar" className="chat-sidebar chat-sidebar-closed d-flex flex-column">
                    <div className="d-flex align-items-center justify-content-end p-2" style={{ height: "60px" }}>
                        <button className="btn" style={{ color: "var(--fontColor" }} onClick={closeSidebar}>Close &times;</button>
                    </div>

                    <div className="p-2">   
                        <h3 className="m-0">WeblerChat</h3>

                        <p style={{ width: "213px" }}>Create a new chat group by clicking the button below:</p>
                        <button onClick={() => setCreateConversationPopupOpened(true)} className="btn btn-primary">Create</button>
                    </div>

                    <div style={{ width: "240px", overflowY: "scroll", flexGrow: 1 }}>
                        {
                            conversationInvites.length > 0 &&
                            <>
                                <p className="text-divider">
                                    <span style={{ backgroundColor: "var(--authFormBGcolor)" }}>Invites</span>
                                </p>
                                {
                                    conversationInvites.map((item, key) => {

                                        return (
                                            <div key={key} className="border-bottom p-2 text-center">
                                                {
                                                    item.inviter &&
                                                    <>
                                                        <p><a href={"/member/" + item.inviter.username}>{item.inviter.username}</a> invited you into {item.conversation.isGroup ? `${item.conversation.title} group` : "conversation"}</p>
                                                        <div className="d-flex justify-content-around" style={{ gap: 8 }}>
                                                            <button onClick={() => handleAcceptInvite(item)} className="btn btn-success">Accept</button>
                                                            <button onClick={() => handleDeclineInvite(item)} className="btn btn-danger">Decline</button>
                                                        </div>
                                                    </>
                                                }
                                            </div>

                                        )
                                    })
                                }
                            </>
                        }

                        {
                            conversationList.length > 0 &&
                            <>
                                <p className="text-divider">
                                    <span style={{ backgroundColor: "var(--chatSideBarColor)" }}>Conversations</span>
                                </p>
                                {
                                    conversationList.map((item, key) => {
                                        const handleOnClick = () => {
                                            closeSidebar();

                                            setActiveConversation(item)

                                            DatabaseClient.updateUser(getUserDetails().uid, {
                                                activeConversationId: item.id
                                            }).then(() => {
                                                updateUserDetails({
                                                    activeConversationId: item.id
                                                })
                                            })

                                        }
                                        return (
                                            <ChatListItem onClick={handleOnClick} key={key} item={item} />
                                        )
                                    })
                                }
                            </>

                        }
                    </div>
                </div>
                <div style={{ position: "relative", height: "calc(100% - 50px)" }}>
                    {
                        activeConversation &&
                        <Chat pageNameC="SocialMainPage" conversation={activeConversation} />
                    }
                </div>
            </div>

        </>
    )
}

export default Messaging