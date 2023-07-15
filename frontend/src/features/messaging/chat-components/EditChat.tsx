import { SyntheticEvent, useEffect, useRef, useState } from "react";
import { Alert } from "react-bootstrap";
import { Link } from "react-router-dom";
import Form from 'react-bootstrap/Form';
import DatabaseClient from "../../../api/DatabaseClient";
import { useAuth } from "../../authentication/AuthContext";
import { User, UserConversation } from "../../member/index"; 
import Loader from "../../../components/Loader";

function EditChat({ conversation }: any) {

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState("")
    const inviteUsernameRef = useRef<any>()
    const { getUserDetails } = useAuth()
    const [groupTitle, setGroupTitle] = useState('')
    const userDetails = getUserDetails()

    useEffect(() => {
        toggleTab("members")
        setLoading(conversation == null)
        if (conversation) {
            setGroupTitle(conversation.title)
        }

    }, [conversation])

    function toggleTab(activeTabName: string) {
        setError('')
        setMessage('')

        const tabs = document.querySelectorAll(".tab");
        const tabPanels = document.querySelectorAll(".tab-pane");

        for (let i = 0; i < tabs.length; ++i) {
            if (tabs[i].id == activeTabName + "-tab") {
                tabs[i].classList.add("active");
            }
            else {
                tabs[i].classList.remove("active");
            }
        }

        for (let i = 0; i < tabPanels.length; ++i) {
            if (tabPanels[i].id == activeTabName + "-tabpanel") {
                tabPanels[i].classList.add("active");
                tabPanels[i].classList.add("show");
            }
            else {
                tabPanels[i].classList.remove("active");
                tabPanels[i].classList.remove("show");
            }
        }
    }

    function handleTabToggle(e: SyntheticEvent, tabName: string) {
        e.preventDefault();

        toggleTab(tabName);
    }

    async function handleInvite() {

        setError('')
        setMessage('')

        if(inviteUsernameRef.current.value == userDetails.username) {
            return setError('You cannot invite yourself')
        }

        setLoading(true)

        try {

            const snapshot = await DatabaseClient.getUserByUsername(inviteUsernameRef.current.value)
            if (!snapshot.exists()) {
                setLoading(false)
                return setError("User with this username does not exist")
            }
            
            const data = snapshot.val();
            const invited = Object.values(data)[0] as User;

            if(invited.conversations && invited.conversations[conversation.id]) {
                setLoading(false)
                return setError("User is already member of this group")
            }

            const userDetails = getUserDetails();
            const userConversation = new UserConversation(conversation.id, conversation.title, conversation.ownerId, conversation.isGroup)
            await DatabaseClient.createConversationInvite(userConversation, invited.uid, userDetails.uid)

            setMessage('User invited')
        }
        catch (err) {
            console.log(err);

            setError('Something went wrong')
        }

        setLoading(false)
    }



    async function saveConversationDetails() {
        try {
            setError('')
            setMessage('')

            if(groupTitle.length < 3 || groupTitle.length > 20) {
                return setError('Title must be 3 - 20 characters long')
            }

            setLoading(true)

            await DatabaseClient.updateConversation(conversation.id, {
                title: groupTitle
            });

            setMessage('Updated successfully')
        }
        catch (err) {
            setError('Update failed')
        }
        setLoading(false)
    }

    async function removeUser(conversationId: string, user: User) {
        setLoading(true)
        try {
            await DatabaseClient.createMessage(conversationId, null, `${user.username} left the conversation`)
            await DatabaseClient.removeUserFromConversation(conversationId, user.uid)
        }
        catch (err) {
            console.log(err);
        }

        setLoading(false)
    }

    async function removeConversation(conversationId: string) {
        console.log(conversationId);
    }

    // Dark theme handler  vvvvvv
  const [switchState, setSwitchState] = useState(false)
  const [moodtheme, setMoodTheme] = useState("light2")
  const handleChange=(e: { target: { checked: any; }; })=>{
    const isDark = e.target.checked ? true: false;
    const body = document.getElementsByTagName("body")[0];
    if (isDark===false) { 
      body.className = "";
      setMoodTheme("light2");
      localStorage.setItem("data-theme", "light");
    }
    else if (isDark === true){
      body.className = " dark";
      setMoodTheme("dark");
      localStorage.setItem("data-theme", "dark");
    }   
    setSwitchState(!switchState)
  }

  const switchIt =()=>{
    let body = document.getElementsByTagName("body")[0];
    if(localStorage.getItem("data-theme")==="dark"){
      body.className = " dark";
      return true;
    }   
    else if (localStorage.getItem("data-theme")==="light"){
      body.className = "";
      return false;
    }
  }
  //Dark theme handler   ^^^^^^^^

    return (
        <>
            {loading && <Loader />}
            {
                conversation &&
                <div className="p-4">
                    <h1 className="mb-4">Conversation Settings</h1>
                    <div className="rounded-lg d-block d-sm-flex" id="conversationSettingDiv">
                        <div className="profile-tab-nav" style={{ padding: "10px" }} >
                            <div className="nav flex-column nav-pills" id="v-pills-tab1" role="tablist" aria-orientation="vertical">
                                <a onClick={(e) => handleTabToggle(e, "members")} className="nav-link tab" id="members-tab" href="#members-tabpanel" data-toggle="pill" role="tab" data-controls="members-tabpanel" aria-selected="false">
                                    <i className="fa fa-group"></i>
                                    Members
                                </a>
                            </div>
                            <div className="nav flex-column nav-pills" id="v-pills-tab2" role="tablist" aria-orientation="vertical">
                                <a onClick={(e) => handleTabToggle(e, "conversation")} className="nav-link tab" id="conversation-tab" href="#members-tabpanel" data-toggle="pill" role="tab" data-controls="members-tabpanel" aria-selected="false">
                                    <i className="fa fa-gear"></i>
                                    General
                                </a>
                            </div>
                            <div className="nav flex-column nav-pills" id="v-pills-tab3" role="tablist" aria-orientation="vertical">
                                <Form style={{alignSelf:"left"}}  data-bs-theme={moodtheme}>
                                <Form.Check
                                    type="switch"
                                    id="dark-theme-switch"
                                    label="Dark Theme"
                                    onChange={handleChange}   
                                    checked = {switchIt()}
                                />
                                </Form>
                            </div>

                        </div>
                        <div className="tab-content" id="v-pills-tabContent" style={{ flexGrow: 1 }}>

                            <div className="tab-pane fade show active" id="members-tabpanel" role="tabpanel" aria-labelledby="members-tab" style={{ backgroundColor: "var(--authFormBGcolor)", padding: "20px", borderRadius: "20px" }}>
                                {conversation.ownerId == userDetails.uid &&
                                    <div>
                                        <h3 className="mb-4">Invite new people</h3>
                                        {error && <Alert variant="danger">{error}</Alert>}
                                        {message && <Alert variant="success">{message}</Alert>}

                                        <div className="form-group">
                                            <input className="inputTag" type="text" placeholder="Enter username" ref={inviteUsernameRef} />
                                            <button className="btn btn-primary mt-2" onClick={handleInvite}>Invite</button>
                                        </div>
                                    </div>
                                }
                                <div className="mt-4">
                                    <h3>Members</h3>
                                    <ul className="list-group">
                                        {
                                            conversation.participants.map((participant: User) => {
                                                return (
                                                    <li className="list-group-item d-flex justify-content-between flex-wrap" style={{ gap: 6, background: "var(--chatGroupMembersListColor)" , border: "solid 1px var(--authFormBGcolor)"}} key={participant.uid}>
                                                        <div className="d-flex align-items-center">
                                                            <Link className="d-flex  align-items-center me-2 NavLink" to={"/member/" + participant.username}>
                                                                <img width={34} height={34} className="rounded-circle me-2" src={participant.avatarUrl ? participant.avatarUrl : "/resources/images/user.svg"} />
                                                                <span>{participant.username}</span>
                                                            </Link>
                                                            <span style={{color:"grey"}}>
                                                                {
                                                                    (conversation.ownerId == participant.uid) ? "Owner" : "Member"
                                                                }
                                                            </span>
                                                        </div>
                                                        <div>
                                                            {
                                                                (conversation.ownerId != participant.uid && conversation.ownerId == userDetails.uid) &&
                                                                <button onClick={() => removeUser(conversation.id, participant)} className="btn btn-danger">Kick</button>
                                                            }
                                                            {
                                                                (conversation.ownerId != participant.uid && participant.uid == userDetails.uid) &&
                                                                <button onClick={() => removeUser(conversation.id, participant)} className="btn btn-danger">Leave</button>
                                                            }
                                                        </div>
                                                    </li>
                                                )
                                            })
                                        }
                                    </ul>
                                </div>
                            </div>

                            <div className="tab-pane fade show active" id="conversation-tabpanel" role="tabpanel" aria-labelledby="conversation-tab" style={{ backgroundColor: "var(--authFormBGcolor)", padding: "20px", borderRadius: "20px" , color:"var(--fontColor)"}}>
                                <h3 className="mb-4">General</h3>
                                {error && <Alert variant="danger">{error}</Alert>}
                                {message && <Alert variant="success">{message}</Alert>}
                                <div className="row">
                                    <div className="col-md-6" id="generalSettingDiv" >
                                        <div className="">
                                            <p>Group Title</p>
                                            <input placeholder="Enter group name here" disabled={userDetails.uid != conversation.ownerId} type="text" className="inputTag" value={groupTitle} onChange={(e) => setGroupTitle((e.target as HTMLInputElement).value)}  />
                                        </div>
                                    </div>
                                </div>
                                {
                                    userDetails.uid == conversation.ownerId &&
                                    <>
                                        <div>
                                            <button className="btn btn-primary" style={{marginTop:"10px"}} onClick={saveConversationDetails}>Save group title</button>
                                        </div>
                                        <hr />
                                        <div>
                                            <button onClick={() => removeConversation(conversation.id)} className="btn btn-danger">Delete Conversation</button>
                                        </div>
                                    </>
                                }
                            </div>

                        </div>
                    </div>
                </div>
            }
        </>
    )
}

export default EditChat