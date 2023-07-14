import PageTitle from "../../partials/PageTitle";
import { useParams } from "react-router-dom";
import { SyntheticEvent, useEffect, useState } from "react";
import User from "./views/User";
import Loader from "../../partials/Loader";
import { useAuth } from "../../context/AuthContext";
import DatabaseClient from "../../api/DatabaseClient";
import { Link } from "react-router-dom";
//import UserConversation from "../views/UserConversation";
//import UserMinimal from "../views/UserMinimal";

function Member() {

    let { username } = useParams();
    const [user, setUser] = useState<User | null>();
    const { signout, getUserDetails } = useAuth()

    useEffect(() => {

        DatabaseClient.getUserByUsername(username as string)
            .then(snapshot => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const user = Object.values(data)[0] as User;
                    setUser(user)
                }
            })

    }, []);

    async function handleLogout() {

        try {
            await signout()
            window.location.href = "/login"
        } catch {
            console.log("Failed to log out")
        }
    }

    async function handleMessage(e: SyntheticEvent) {
        e.preventDefault()

        // TODO
        /*const userDetails = getUserDetails()
        if(!userDetails || !user) {
            return
        }

        try {
            const conversation = await DatabaseClient.createConversation("", "", false)
            const userConversation = new UserConversation(conversation.id, "", "", false)
            const loggedUser = new UserMinimal(userDetails.uid, userDetails.username, userDetails.avatarUrl)
            
            await DatabaseClient.addUserToConversation(userConversation, loggedUser)
            let invite = await DatabaseClient.createConversationInvite(userConversation, user.uid, loggedUser)
            console.log(invite);
        }
        catch(err) {
            console.log(err)
        }*/
    }

    user ? PageTitle(`${user?.username + " | Webler"}`) : PageTitle("Webler")

    return (
        <>
            {/* Main */}
            <main>
                {
                    user ?
                        <>
                            <div style={{ maxWidth: "900px", marginLeft: "auto", marginRight: "auto", background: "#88bccc3b" }}>
                                <div className="d-block d-sm-flex p-4" style={{ gap: 12 }}>
                                    <div className="img-circle text-center mb-2">
                                        <img width={128} height={128} className="rounded-circle" src={user.avatarUrl ? user.avatarUrl : "/resources/images/user.svg"} />
                                    </div>
                                    <div className="d-flex flex-column align-items-center align-items-sm-start">
                                        <h3>{user.username}</h3>
                                        <div className="d-flex" style={{ gap: 8 }}>
                                            <b>0 Following</b>
                                            <b>0 Followers</b>
                                        </div>
                                        <p>{user.bio}</p>
                                        <div className="d-flex" style={{ gap: 8 }}>
                                            {
                                                user.username == getUserDetails()?.username ?
                                                    <>
                                                        <a href="#" onClick={handleLogout} className="btn btn-secondary">Logout</a>
                                                        <Link to="/edit-member" style={{textDecoration:"none"}} className="btn btn-primary">Edit Profile</Link>
                                                    </>
                                                    :
                                                    <>
                                                        <a href="#" className="btn btn-primary">Follow</a>
                                                        <a href="#" onClick={handleMessage} className="btn btn-primary">Message</a>
                                                    </>
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                        :
                        <>
                            <Loader />
                        </>
                }
            </main>
        </>
    );
}

export default Member;
