import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Alert, Button, Form, FormControl, FormGroup, FormLabel, Modal, Tab, Tabs } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import countries from "../../../data/countries";
import { UserDetails } from "./Profile";
import { useAuth } from "../../auth/context/authContext";
import PasswordFormControl from "../../../components/PasswordFormControl";
import { FaCheckCircle } from "react-icons/fa";
import { FaCircleXmark } from "react-icons/fa6";
import { useApi } from "../../../context/apiCommunication";
import PushNotificationsTab from "../components/PushNotificationsTab";

interface ProfileSettingsProps {
    userDetails: UserDetails;
    onUpdate: (data: any) => void
}

const ProfileSettings = ({ userDetails, onUpdate }: ProfileSettingsProps) => {
    const { sendJsonRequest } = useApi();
    const [searchParams, setSearchParams] = useSearchParams();
    const [visible, setVisible] = useState(false);

    const { userInfo, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [bio, setBio] = useState("");
    const [countryCode, setCountryCode] = useState("");
    const [infoMessage, setInfoMessage] = useState([true, ""]);

    const [emailMessage, setEmailMessage] = useState([true, ""]);
    const [emailPassword, setEmailPassword] = useState("");
    const [emailStep, setEmailStep] = useState(0);
    const [emailVerified, setEmailVerified] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordMessage, setPasswordMessage] = useState([true, ""]);

    const [avatarImageFile, setAvatarImageFile] = useState<File | null>(null);
    const [avatarMessage, setAvatarMessage] = useState([true, ""]);

    useEffect(() => {
        if (userDetails) {
            setUsername(userDetails.name || "");
            setEmail(userDetails.email || "");
            setBio(userDetails.bio || "");
            setCountryCode(userDetails.countryCode || "");
            setEmailVerified(userDetails.emailVerified || false);
        }
    }, [userDetails]);

    useEffect(() => {
        setVisible(searchParams.has("settings"));
    }, [searchParams]);

    const onClose = () => {
        searchParams.delete("settings");
        setSearchParams(searchParams);
    }

    const handleSubmit = async (e: FormEvent, action: () => Promise<void>) => {
        e.preventDefault();

        setLoading(true);

        await action();

        setLoading(false);
    }

    const saveInfo = async () => {

        setInfoMessage([true, ""]);
        if (!userInfo) {
            return;
        }
        const data = await sendJsonRequest(`/Profile/UpdateProfile`, "PUT", {
            userId: userInfo.id,
            name: username,
            bio,
            countryCode
        });
        if (data.success) {
            userInfo.name = data.data.name;
            userInfo.countryCode = data.data.coutryCode;
            updateUser(userInfo);
            onUpdate(data.data);
            setInfoMessage([true, "Information saved successfully"]);
        }
        else {
            setInfoMessage([false, data.error._message ? data.error._message : "Bad request"])
        }
    }

    const resetInfo = () => {
        if (userDetails) {
            setUsername(userDetails.name || "");
            setBio(userDetails.bio || "");
            setCountryCode(userDetails.countryCode || "");
        }
        setInfoMessage([true, ""])
    }

    const changeEmail = async () => {
        setEmailMessage([true, ""]);
        if (!userInfo) {
            return;
        }
        const data = await sendJsonRequest(`/Profile/ChangeEmail`, "POST", {
            email,
            password: emailPassword
        });
        if (data.success) {
            userInfo.email = data.data.email;
            updateUser(userInfo);
            onUpdate({ email: data.data.email, emailVerified: false });
            setEmailMessage([true, "Email changed successfully"])
            setEmailStep(0);
            setEmailVerified(false)
        }
        else {
            if (data.error.code === 11000) {
                setEmailMessage([false, "Email already exists"]);
            }
            else {
                setEmailMessage([false, data.error._message ? data.error._message : "Bad request"])
            }
            setEmailPassword("")
        }
    }

    const resetEmail = () => {
        if (userDetails) {
            setEmail(userDetails.email || "");
        }
        setEmailStep(0);
        setEmailPassword("")
        setEmailMessage([true, ""])
    }

    const changePassword = async () => {
        setPasswordMessage([true, ""]);
        if (!userInfo) {
            return;
        }
        if (currentPassword === newPassword) {
            setPasswordMessage([false, "Passwords cannot be same"]);
            return
        }
        const data = await sendJsonRequest(`/Profile/ChangePassword`, "POST", {
            currentPassword,
            newPassword
        });
        if (data.success) {
            setPasswordMessage([true, "Password changed successfully"])
            setCurrentPassword("");
            setNewPassword("");
        }
        else {
            setPasswordMessage([false, data.error._message ? data.error._message : "Bad request"])
        }
    }

    const resetPassword = () => {
        setPasswordMessage([true, ""])
        setCurrentPassword("");
        setNewPassword("");
    }

    const handleEmailNext = () => {
        setEmailStep(1)
        setEmailMessage([true, ""])
    }

    const handleSendVerificationEmail = async () => {
        setLoading(true)
        setEmailMessage([true, ""]);
        const data = await sendJsonRequest(`/Profile/SendActivationCode`, "POST");
        if (data.success) {
            setEmailMessage([true, "Verification email was sent"])
        }
        else {
            setEmailMessage([false, data.message ? data.message : "Verification email could not be sent"])
        }
        setLoading(false)
    }

    const handleAvatarUpload = async (e: FormEvent) => {
        if (!userInfo) return;
        e.preventDefault();

        // Validate file presence
        if (!avatarImageFile) {
            setAvatarMessage([false, "Please select an image file."]);
            return;
        }

        // Validate file type
        if (!/^image\/(png|jpe?g|gif)$/i.test(avatarImageFile.type)) {
            setAvatarMessage([false, "Only PNG, JPG, JPEG or GIF images are allowed."]);
            return;
        }

        if (avatarImageFile.size > 10 * 1024 * 1024) {
            setAvatarMessage([false, "File size must be less than or equal to 10 MB."]);
            return;
        }

        setLoading(true);
        setAvatarMessage([true, ""]);

        const result = await sendJsonRequest(
            "/Profile/UploadProfileAvatarImage",
            "POST",
            { avatarImage: avatarImageFile },
            {},
            true
        );

        if (result && result.success) {
            userInfo.avatarImage = result.data.avatarImage;
            updateUser(userInfo);
            setAvatarMessage([true, "Avatar image updated successfully"]);
        } else {
            setAvatarMessage([false, result.message ?? "Avatar image failed to update"]);
        }

        setLoading(false);
    };


    const handleAvatarChange = (e: ChangeEvent) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
            setAvatarImageFile(files[0]);
        }
    }

    const onUserNotificationsUpdate = () => {
    }

    return (
        <Modal show={visible} onHide={onClose} fullscreen="sm-down" centered contentClassName="wb-modal__container edit-profile">
            <Modal.Header closeButton>
                <Modal.Title>Edit Profile</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Tabs defaultActiveKey="information" className="mb-3">
                    <Tab eventKey="information" title="Information">
                        <Form onSubmit={(e) => handleSubmit(e, saveInfo)}>
                            {infoMessage[1] && <Alert variant={infoMessage[0] ? "success" : "danger"}>{infoMessage[1]}</Alert>}
                            <FormGroup>
                                <FormLabel>Username</FormLabel>
                                <FormControl type="text" required value={username} minLength={3} maxLength={20} onChange={(e) => setUsername(e.target.value)} />
                            </FormGroup>
                            <FormGroup>
                                <FormLabel>Bio</FormLabel>
                                <FormControl as="textarea" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
                            </FormGroup>
                            <FormGroup>
                                <FormLabel>Country</FormLabel>
                                <Form.Select aria-label="Country selection" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                                    <option value="">Not Set</option>
                                    {
                                        countries.map((country, idx) => {
                                            return (
                                                <option key={idx} value={country.code}>{country.name}</option>
                                            )
                                        })
                                    }
                                </Form.Select>
                            </FormGroup>
                            <FormGroup className="mt-2">
                                <Button type="submit" disabled={loading}>Save</Button>
                                <Button onClick={resetInfo} className="ms-2" type="button" disabled={loading}>Reset</Button>
                            </FormGroup>
                        </Form>
                    </Tab>
                    <Tab eventKey="email" title="Email" onEnter={resetEmail}>
                        <Form onSubmit={(e) => handleSubmit(e, changeEmail)}>
                            {emailMessage[1] && <Alert variant={emailMessage[0] ? "success" : "danger"}>{emailMessage[1]}</Alert>}
                            <FormGroup>
                                <FormLabel>{emailStep === 0 ? "Email" : "New Email"}</FormLabel>
                                <FormControl readOnly={emailStep === 0} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                            </FormGroup>
                            {
                                emailStep === 0 ?
                                    <>
                                        <FormGroup className="mt-2">
                                            <Button onClick={handleEmailNext} type="button">Change</Button>
                                        </FormGroup>
                                        <FormGroup>
                                            <FormLabel>Email status</FormLabel>
                                            <div className="d-flex justify-content-between">
                                                <div className="d-flex align-items-center gap-1">
                                                    {
                                                        emailVerified ?
                                                            <>
                                                                <div className="text-success">
                                                                    <FaCheckCircle />
                                                                </div>
                                                                <i>Verified</i>
                                                            </>
                                                            :
                                                            <>
                                                                <div className="text-secondary">
                                                                    <FaCircleXmark />
                                                                </div>
                                                                <i>Unverified</i>
                                                            </>
                                                    }
                                                </div>
                                                {
                                                    emailVerified === false &&
                                                    <Button disabled={loading} onClick={handleSendVerificationEmail}>Send verification mail</Button>
                                                }
                                            </div>
                                        </FormGroup>
                                    </>
                                    :
                                    <>
                                        <FormGroup>
                                            <FormLabel>Current Password</FormLabel>
                                            <PasswordFormControl password={emailPassword} setPassword={setEmailPassword} />
                                        </FormGroup>
                                        <FormGroup className="mt-2">
                                            <Button type="submit" disabled={loading}>Confirm</Button>
                                            <Button variant="secondary" onClick={resetEmail} className="ms-2" type="button" disabled={loading}>Cancel</Button>
                                        </FormGroup>
                                    </>
                            }
                        </Form>
                    </Tab>
                    <Tab eventKey="password" title="Password">
                        <Form onSubmit={(e) => handleSubmit(e, changePassword)}>
                            {passwordMessage[1] && <Alert variant={passwordMessage[0] ? "success" : "danger"}>{passwordMessage[1]}</Alert>}
                            <FormGroup>
                                <FormLabel>Current Password</FormLabel>
                                <PasswordFormControl password={currentPassword} setPassword={setCurrentPassword} />
                            </FormGroup>
                            <FormGroup>
                                <FormLabel>New Password</FormLabel>
                                <PasswordFormControl password={newPassword} setPassword={setNewPassword} />
                            </FormGroup>
                            <FormGroup className="mt-2">
                                <Button type="submit" disabled={loading}>Change</Button>
                                <Button onClick={resetPassword} className="ms-2" type="button" disabled={loading}>Reset</Button>
                            </FormGroup>
                        </Form>
                    </Tab>
                    <Tab eventKey="avatar" title="Avatar">
                        <Form onSubmit={handleAvatarUpload}>
                            {avatarMessage[1] && <Alert variant={avatarMessage[0] ? "success" : "danger"}>{avatarMessage[1]}</Alert>}
                            <FormGroup>
                                <FormLabel>Avatar image</FormLabel>
                                <FormControl
                                    size="sm"
                                    type="file"
                                    required
                                    accept="image/png, image/jpeg, image/jpg, image/gif"
                                    onChange={handleAvatarChange}
                                />
                            </FormGroup>
                            <div className="d-flex justify-content-end mt-2">
                                <Button size="sm" className="ms-2" variant="primary" type="submit" disabled={loading}>Upload</Button>
                            </div>
                        </Form>
                    </Tab>
                    <Tab eventKey="notifications" title="Push Notifications">
                        <PushNotificationsTab userId={userInfo?.id || ""} userNotifications={userDetails.notifications} onUpdate={onUserNotificationsUpdate} />
                    </Tab>
                </Tabs>
            </Modal.Body>
        </Modal>
    )
}

export default ProfileSettings;