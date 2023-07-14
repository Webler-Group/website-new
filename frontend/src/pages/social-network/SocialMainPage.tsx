import PageTitle from "../../partials/PageTitle";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DatabaseClient from "../../api/DatabaseClient";
import User from "../account-profile/views/User";
import { useAuth } from '../../context/AuthContext';
import Loader from "../../partials/Loader";
import Messaging from "./chat/Messaging";

function SocialMainPage() {

    const [memberList, setMemberlist] = useState<User[]>([]);
    const { getUserDetails } = useAuth();
    const [user, setUser] = useState<User>(getUserDetails());
    

    useEffect(() => {
        DatabaseClient.getAllUsers()
            .then(snapshot => {
                const data = snapshot.val();
                setMemberlist(Object.values(data))
            })
    }, [])

    const changeSettingMenuBarSize =()=>{
        let em1 = document.getElementById("conversationSettingDiv");
        let em2 = document.getElementById("generalSettingDiv");
        let em3 = document.getElementById("v-pills-tab3");

        if(em1!==null && em2!==null && em3!==null){
            em1.className = "rounded-lg d-block";
            em2.className = "";
            em3.style.display = "none";
        }

        setUser(user);
        
    }

    PageTitle("Social | Webler")
    return (
        <>
            {/* Header */}
            

            {/* Main */}
            <main style={{margin:"0px",padding:"0px", display:"block", minHeight:"fit-content", minWidth:"100vw", overflowX:"hidden" }}>
                <div className="socialContainer" style={{position:"relative", top:"0px"}}>
                    <div className="socialLeft">
                        <div  className="stickySocial" style={{backgroundColor:"var(--chatSideBarColor)", width:"100%", height:"50px"}} >
                            <h5 style={{padding:"8px"}}>Suggested friends:</h5>
                        </div>
                        <div id="ListForFriendSuggestions" style={{padding:"5px"}}>{/* This is replacement for <ul>*/}
                        { //Suggested friends 
                            memberList.length > 0 ? 
                            <>
                                {
                                    memberList.map((item: User, key) => {
                                        return (
                                            <div className="memberListItem" key={key}> {/* This was previously <li> */}
                                                <Link to={"/member/"+item.username} style={{textDecoration:"none"}} ><img width={32} height={32} className="rounded-circle" src={item.avatarUrl ? item.avatarUrl : "/resources/images/user.svg"} /><div className="listItemNameUser">{item.username}</div></Link>
                                            </div>
                                        )
                                    })
                                }
                            </>
                            :
                            <>
                                <Loader />
                            </>
                        }
                        </div>
                    <p style={{padding:"5px"}}> Listed above are the current members of Webler.</p>
                    <hr />
                    <p style={{padding:"5px", fontSize:"smaller"}}> 2023 - Copyright - Webler</p>
                    </div>


                    <input type="checkbox" name="" id="side-menu-left-switch" style={{display:"none"}} />
                    <div className="side-menu-left">
                        <div className="mobileSocialLeft" style={{overflowY:"scroll"}}>
                            {/* Friends suggestions , left sidebar on Social (mobile layout) */}
                            
                            <div  className="stickySocial" style={{backgroundColor:"var(--chatSideBarColor)", width:"100%", height:"50px"}} >
                                <h5 style={{padding:"8px"}}>Suggested friends:</h5>
                            </div>
                            <div id="ListForFriendSuggestions" style={{padding:"5px"}}>{/* This is replacement for <ul>*/}
                            { //Suggested friends 
                                memberList.length > 0 ? 
                                <>
                                    {
                                        memberList.map((item: User, key) => {
                                            return (
                                                <div className="memberListItem" key={key}> {/* This was previously <li> */}
                                                    <Link to={"/member/"+item.username} style={{textDecoration:"none"}} ><img width={32} height={32} className="rounded-circle" src={item.avatarUrl ? item.avatarUrl : "/resources/images/user.svg"} /><div className="listItemNameUser">{item.username}</div></Link>
                                                </div>
                                            )
                                        })
                                    }
                                </>
                                :
                                <>
                                    <Loader />
                                </>
                            }
                            <p style={{padding:"5px"}}> Listed above are the current members of Webler.</p>
                            <hr />
                            <p style={{padding:"5px", fontSize:"smaller"}}> 2023 - Copyright - Webler</p>
                            </div>
                        </div>
                        <label htmlFor="side-menu-left-switch">
                            <i className="fa fa-group"></i>
                        </label>
                    </div>

                    <input type="checkbox" name="" id="side-menu-right-switch" style={{display:"none"}} />
                    <div className="side-menu-right">
                        <div className="mobileSocialRight" onLoad={changeSettingMenuBarSize} onResize={changeSettingMenuBarSize}>
                            {/* Chat , right sidebar on Social (mobile layout) */}
                            {
                                (user)?
                                    screen.width<=800?<Messaging pageName={"SocialMainPage"} />:null
                                :
                                <>
                                    <div  className="stickySocial" style={{backgroundColor:"var(--chatSideBarColor)", width:"100%", height:"50px"}} >
                                        <h5 style={{padding:"8px"}}>Chat:</h5>
                                    </div>
                                    <div style={{textAlign:"center"}} >
                                        <p>Please login to use chat</p>
                                    </div>
                                    
                                </>
                            }
                        </div>
                        <label htmlFor="side-menu-right-switch" onLoad={changeSettingMenuBarSize} >
                            <i className="fa fa-comments-o"></i>
                        </label>
                    </div>
                    

                    <div className="socialMiddle">
                        <div className="stickySocial" style={{backgroundColor:"var(--chatSideBarColor)", width:"100%", height:"50px"}} >
                            <h5 style={{padding:"8px", textAlign:"center"}}>Posts Feed</h5>
                        </div>
                        
                        <div className="postsList">
                            {/* Items of Posts List/array go here   vvvvvv */}
                            <div className="postsListItem">
                                <p>Post item: __1__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __2__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __3__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __4__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __5__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __6__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __7__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __8__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __9__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __10__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __11__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __12__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __13__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __14__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __15__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __16__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __17__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __18__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __19__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __20__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __21__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __22__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __23__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __24__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __25__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __26__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __27__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            <div className="postsListItem">
                                <p>Post item: __28__</p>
                                <p>Posted by: _____</p>
                                <p>Contents of post: ____</p>
                            </div>
                            {/* Items of Posts List/array above ^^^^^^^ */}
                        </div>
                    </div>

                    <div className="socialRight" onLoad={changeSettingMenuBarSize} onResize={changeSettingMenuBarSize}>
                        {
                            (user)?
                                screen.width>800?<Messaging pageName={"SocialMainPage"} />:null
                            :
                            <>
                                <div  className="stickySocial" style={{backgroundColor:"var(--chatSideBarColor)", width:"100%", height:"50px"}} >
                                    <h5 style={{padding:"8px"}}>Chat:</h5>
                                </div>
                                <div style={{textAlign:"center"}} >
                                    <p>Please login to use chat</p>
                                </div>
                                
                            </>
                        }
                    </div>
                </div>
            </main>
        </>
    );
}

export default SocialMainPage;