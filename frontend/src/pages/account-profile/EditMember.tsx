import PageTitle from "../../partials/PageTitle";
import Button from 'react-bootstrap/Button';
import { SyntheticEvent, useEffect, useState } from "react";
import { Alert, Form } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import Reauntheticate from "./Reauntheticate";
import Loader from "../../partials/Loader";
import DatabaseClient from "../../api/DatabaseClient";
import StorageClient from "../../api/StorageClient";

function EditMember() {

    const { changePassword, getUserDetails, updateUserDetails } = useAuth()
    const [activeTab, setActiveTab] = useState("account")
    const [uid, setUid] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [bio, setBio] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState("")
    const [authRequired, setAuthRequired] = useState(false)
    const [password, setPassword] = useState<string>('')
    const [passwordConfirmation, setPasswordConfirmation] = useState<string>('')
    const [file, setFile] = useState<File | null>(null)
    const [avatarUrl, setAvatarUrl] = useState<string>('')

    useEffect(() => {

        const userDetails = getUserDetails();

        setUid(userDetails.uid);
        setUsername(userDetails.username)
        setBio(userDetails.bio)
        setAvatarUrl(userDetails.avatarUrl)

        setLoading(true);

        DatabaseClient.getUser(userDetails.uid)
            .then(snapshot => {
                const data = snapshot.val();

                let user = data as any;

                setUsername(user.username)
                setBio(user.bio)
                setAvatarUrl(user.avatarUrl)

                setLoading(false);
            })

    }, []);

    useEffect(() => {
        toggleTab(activeTab);
    }, [activeTab, authRequired]);

    async function saveAccountSettings() {
        try {
            setError('')
            setMessage('')

            if(!username.match(/^[a-zA-Z]+[a-zA-Z0-9]*$/)) {
                return setError('Username must start with a letter and can contain only letters and numbers')
            }

            if(username.length < 3 || username.length > 20) {
                return setError('Username must be 3 - 20 characters long')
            }

            if(bio.length > 240) {
                return setError('Bio cannot have more than 240 characters')
            }

            setLoading(true)

            if(username != getUserDetails().username) {
                let snapshot = await DatabaseClient.getUserByUsername(username);
                if(snapshot.exists()) {
                    setLoading(false)
                    return setError("Username is used")
                }
            }

            await DatabaseClient.updateUser(uid, {
                usernameLowercase: username.toLowerCase(),
                username,
                bio
            });

            updateUserDetails({
                username,
                bio
            })

            setMessage('Account updated')
        }
        catch (err) {
            setError('Account update failed')
        }
        setLoading(false)
    }

    async function handlePasswordChange() {

        setError('')
        setMessage('')

        if (password.length < 6) {
            return setError("Passwords must be at least 6 characters long")
        }

        if (passwordConfirmation != password) {
            return setError("Passwords do not match")
        }

        setLoading(true)

        await changePassword(password)
            .then(() => {
                setMessage('Password changed')
                setPassword('')
                setPasswordConfirmation('')
            })
            .catch(() => {
                setAuthRequired(true)
            });
        setLoading(false)
    }

    function returnFromAuthentication() {
        setAuthRequired(false)
    }

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

        setActiveTab(tabName);
    }

    function handleFile(e: SyntheticEvent) {
        let fileList = (e.target as HTMLInputElement).files as FileList;

        setFile(fileList[0])
        if (fileList[0]) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setAvatarUrl(reader.result as string)
            });
            reader.readAsDataURL(fileList[0]);
        }

    }

    async function handleAvatarUpload() {

        setLoading(true)
        setError('')
        setMessage('')

        if (!file) {
            return setError('No image selected')
        }

        try {
            const path = `avatars/${uid}`;
            await StorageClient.uploadFile(path, file);
            let url = await StorageClient.getUrl(path);

            setAvatarUrl(url)

            await DatabaseClient.updateUser(uid, {
                avatarUrl: url
            })

            updateUserDetails({
                avatarUrl: url
            })

            setMessage('Avatar updated')
        }
        catch {
            setError('Avatar update failed')
        }

        setLoading(false)
    }

    async function handleAvatarRemoval() {
        setLoading(true)
        setError('')
        setMessage('')

        try {

            setFile(null)
            setAvatarUrl('')

            await DatabaseClient.updateUser(uid, {
                avatarUrl: ""
            })

            updateUserDetails({
                avatarUrl: ""
            })

            setMessage('Avatar updated')
        }
        catch {
            setError('Avatar update failed')
        }

        setLoading(false)
    }

    PageTitle(`${getUserDetails().username} | Webler`)

    return (
        <>
            {/* Main */}
            <main>
                {loading && <Loader />}
                {
                    authRequired ?
                        <>
                            <Reauntheticate onAuth={returnFromAuthentication} onReturn={returnFromAuthentication} />
                        </>
                        :
                        <>
                            <h1 className="mb-4">Account Settings</h1>
                            <div className="rounded-lg d-block d-sm-flex">
                                <div className="profile-tab-nav border-right" style={{backgroundColor:"var(--authFormBGcolor)",padding:"20px", borderRadius:"20px"}} >
                                    <div className="p-4">
                                        <h4 className="text-center">{getUserDetails().username}</h4>
                                    </div>
                                    <div className="nav flex-column nav-pills" id="v-pills-tab" role="tablist" aria-orientation="vertical">
                                        <a onClick={(e) => handleTabToggle(e, "account")} className="nav-link active tab" id="account-tab" href="#account-tabpanel" data-toggle="pill" role="tab" data-controls="account-tabpanel" aria-selected="true">
                                            <i className="fa fa-home text-center mr-1"></i>
                                            Account
                                        </a>
                                        <a onClick={(e) => handleTabToggle(e, "password")} className="nav-link tab" id="password-tab" href="#password-tabpanel" data-toggle="pill" role="tab" data-controls="password-tabpanel" aria-selected="false">
                                            <i className="fa fa-key text-center mr-1"></i>
                                            Password
                                        </a>
                                    </div>
                                </div>
                                <div className="tab-content p-4 p-md-5" id="v-pills-tabContent">
                                    <div className="tab-pane fade show active" id="account-tabpanel" role="tabpanel" aria-labelledby="account-tab" style={{backgroundColor:"var(--authFormBGcolor)",padding:"20px", borderRadius:"20px"}}>
                                        <h3 className="mb-4">Account Settings</h3>
                                        {error && <Alert variant="danger">{error}</Alert>}
                                        {message && <Alert variant="success">{message}</Alert>}
                                        <div className="row">
                                            <div className="col-md-12">
                                                <div className="d-flex" style={{ gap: 12 }}>
                                                    <div className="img-circle mb-2">
                                                        <img width={96} height={96} className="rounded-circle" src={avatarUrl ? avatarUrl : "/resources/images/user.svg"} />
                                                    </div>
                                                    <div>
                                                        <div className="mb-2">
                                                            <input className="form-control" type="file" name="file" onChange={handleFile} />
                                                        </div>
                                                        <div className="d-flex" style={{ gap: 12 }}>
                                                            {
                                                                file &&
                                                                <>
                                                                    <button onClick={handleAvatarUpload} className="btn btn-primary">Set</button>
                                                                </>
                                                            }
                                                            {
                                                                avatarUrl &&
                                                                <>
                                                                    <button onClick={handleAvatarRemoval} className="btn btn-primary">
                                                                        <i className="fa fa-trash"></i>
                                                                    </button>
                                                                </>
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Username</label>
                                                    <input type="text" className="form-control" value={username} onChange={(e) => setUsername((e.target as HTMLInputElement).value)} />
                                                </div>
                                            </div>
                                            <div className="col-md-12">
                                                <div className="form-group">
                                                    <label>Bio</label>
                                                    <textarea className="form-control" value={bio} onChange={(e) => setBio((e.target as HTMLTextAreaElement).value)}></textarea>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <button onClick={saveAccountSettings} className="btn btn-primary" >Save</button>
                                            <Link to={"/member/"+username} style={{textDecoration:"none"}}><Button variant="secondary" style={{marginLeft:"20px"}}>Back to profile</Button></Link>
                                        </div>
                                    </div>
                                    <div className="tab-pane fade" id="password-tabpanel" role="tabpanel" aria-labelledby="password-tab" style={{backgroundColor:"var(--authFormBGcolor)",padding:"20px", borderRadius:"20px"}} >
                                        <h3 className="mb-4">Password Settings</h3>
                                        {error && <Alert variant="danger">{error}</Alert>}
                                        {message && <Alert variant="success">{message}</Alert>}
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>New password</label>
                                                    <Form.Control type="password" value={password} onChange={(e) => setPassword((e.target as HTMLInputElement).value)} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Confirm new password</label>
                                                    <Form.Control type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation((e.target as HTMLInputElement).value)} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <button onClick={handlePasswordChange} className="btn btn-primary">Change</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                }

            </main>
        </>
    );
}

export default EditMember;
