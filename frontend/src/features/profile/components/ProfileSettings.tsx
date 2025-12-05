import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Button, Form, FormControl, FormGroup, FormLabel, Modal, Tab, Tabs } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import countries from "../../../data/countries";
import { UserDetails } from "../pages/ProfilePage";
import { useAuth } from "../../auth/context/authContext";
import PasswordFormControl from "../../../components/PasswordFormControl";
import { FaCheckCircle } from "react-icons/fa";
import { FaCircleXmark } from "react-icons/fa6";
import { useApi } from "../../../context/apiCommunication";
import NotificationsTab from "./NotificationsTab";
import RequestResultAlert from "../../../components/RequestResultAlert";
import ProfileAvatar from "../../../components/ProfileAvatar";

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
    const [infoMessage, setInfoMessage] = useState<{ message?: string; errors?: any[]; }>({});

    const [emailMessage, setEmailMessage] = useState<{ message?: string; errors?: any[]; }>({});
    const [emailPassword, setEmailPassword] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [emailStep, setEmailStep] = useState(0);
    const [emailVerified, setEmailVerified] = useState(false);

    const [passwordMessage, setPasswordMessage] = useState<{ message?: string; errors?: any[]; }>({});

    const [avatarImageFile, setAvatarImageFile] = useState<File | null>(null);
    const [avatarMessage, setAvatarMessage] = useState<{ message?: string; errors?: any[]; }>({});

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);

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

        setInfoMessage({});
        if (!userInfo) {
            return;
        }
        const result = await sendJsonRequest(`/Profile/UpdateProfile`, "PUT", {
            userId: userDetails.id,
            name: username,
            bio,
            countryCode
        });
        if (result.success) {
            if (userDetails.id == userInfo.id) {
                userInfo.name = result.data.name;
                userInfo.countryCode = result.data.coutryCode;
                updateUser(userInfo);
            }
            onUpdate(result.data);
            setInfoMessage({ message: "Information saved successfully", errors: [] });
        }
        else {
            setInfoMessage({ errors: result?.error });
        }
    }

    const resetInfo = () => {
        if (userDetails) {
            setUsername(userDetails.name || "");
            setBio(userDetails.bio || "");
            setCountryCode(userDetails.countryCode || "");
        }
        setInfoMessage({});
    }

    const initiateEmailChange = async () => {
        setEmailMessage({});
        if (!userInfo) {
            return;
        }
        const result = await sendJsonRequest(`/Profile/ChangeEmail`, "POST", {
            email,
            password: emailPassword
        });
        if (result.success) {
            setEmailStep(2);
            setEmailMessage({ message: "Verification code sent to your current email." });
            setEmailPassword("");
        }
        else {
            setEmailMessage({ errors: result?.error });
            setEmailPassword("");
        }
    }

    const verifyEmailChange = async () => {
        if (!userInfo) return;
        setEmailMessage({});
        const result = await sendJsonRequest(`/Profile/VerifyEmailChange`, "POST", {
            code: verificationCode
        });
        if (result.success) {
            userInfo.email = result.data.email;
            updateUser(userInfo);
            onUpdate({ email: result.data.email, emailVerified: false });
            setEmailMessage({ message: "Email changed successfully" });
            setEmailStep(0);
            setEmailVerified(false);
            setVerificationCode("");
        }
        else {
            setEmailMessage({ errors: result?.error });
            setVerificationCode("");
        }
    }

    const resetEmail = () => {
        if (userDetails) {
            setEmail(userDetails.email || "");
        }
        setEmailStep(0);
        setEmailPassword("");
        setVerificationCode("");
        setEmailMessage({});
    }

    const handleEmailNext = () => {
        setEmailStep(1);
        setEmail("");
        setEmailMessage({});
    }

    const handleSendVerificationEmail = async () => {
        setLoading(true)
        setEmailMessage({});
        const result = await sendJsonRequest(`/Profile/SendActivationCode`, "POST");
        if (result.success) {
            setEmailMessage({ message: "Verification email was sent" });
        }
        else {
            setEmailMessage({ errors: result?.error });
        }
        setLoading(false);
    }

    const handleAvatarUpload = async (e: FormEvent) => {
        e.preventDefault();

        if (!userInfo) return;

        if (!avatarImageFile) {
            setAvatarMessage({ errors: [{ message: "avatarImage is required" }] });
            return;
        }

        if (avatarImageFile.size > 10 * 1024 * 1024) {
            setAvatarMessage({ errors: [{ message: "avatarImage size must be less than 10 MB" }] });
            return;
        }

        setLoading(true);
        setAvatarMessage({});

        const result = await sendJsonRequest(
            "/Profile/UploadProfileAvatarImage",
            "POST",
            { avatarImage: avatarImageFile, userId: userDetails.id },
            {},
            true
        );

        if (result && result.success) {
            if (userDetails.id == userInfo.id) {
                userInfo.avatarImage = result.data.avatarImage;
                updateUser(userInfo);
            }
            onUpdate({ avatarImage: result.data.avatarImage });
            setAvatarMessage({ message: "Avatar image updated successfully" });
        } else {
            setAvatarMessage({ errors: result?.error });
        }

        setLoading(false);
    };

    const handleAvatarRemove = async () => {
        if (!userInfo) return;

        setLoading(true);
        setAvatarMessage({});

        const result = await sendJsonRequest(
            "/Profile/RemoveProfileAvatarImage",
            "POST",
            { userId: userDetails.id }
        );

        if (result && result.success) {
            if (userDetails.id == userInfo.id) {
                userInfo.avatarImage = null;
                updateUser(userInfo);
            }
            onUpdate({ avatarImage: null });
            setAvatarMessage({ message: "Avatar image removed successfully" });
        } else {
            setAvatarMessage({ errors: result?.error });
        }

        closeDeleteModal();
        setLoading(false);
    }

    const handleAvatarChange = (e: ChangeEvent) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
            setAvatarImageFile(files[0]);
        }
    }

    const onUserNotificationsUpdate = () => {
    }

    const handleSendPasswordResetEmail = async () => {
        setLoading(true);
        setPasswordMessage({});
        const result = await sendJsonRequest("/Auth/SendPasswordResetCode", "POST", { email: userInfo?.email });
        if (result && result.success) {
            setPasswordMessage({ message: "Email sent successfully" });
        }
        else {
            setPasswordMessage({ errors: result?.error });
        }
        setLoading(false);
    }

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
    }

    return (
        <>
            <Modal size="sm" backdropClassName="wb-p-details-delete-modal__backdrop" style={{ zIndex: 1060 }} show={deleteModalVisible} onHide={closeDeleteModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Are you sure?</Modal.Title>
                </Modal.Header>
                <Modal.Body>Your profile avatar will be removed.</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
                    <Button variant="danger" onClick={handleAvatarRemove}>Remove</Button>
                </Modal.Footer>
            </Modal>
            <Modal show={visible} onHide={onClose} fullscreen="sm-down" centered contentClassName="wb-modal__container edit-profile">
                <Modal.Header closeButton>
                    <Modal.Title>Edit Profile</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Tabs defaultActiveKey="information" className="mb-3">
                        <Tab eventKey="information" title="Information">
                            <Form onSubmit={(e) => handleSubmit(e, saveInfo)}>
                                <RequestResultAlert errors={infoMessage.errors} message={infoMessage.message} />
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
                            <Form onSubmit={(e) => handleSubmit(e, emailStep === 1 ? initiateEmailChange : (emailStep === 2 ? verifyEmailChange : async () => { }))}>
                                <RequestResultAlert errors={emailMessage.errors} message={emailMessage.message} />
                                <FormGroup>
                                    <FormLabel>{emailStep === 0 ? "Email" : "New Email"}</FormLabel>
                                    <FormControl readOnly={emailStep === 0 || emailStep === 2} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
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
                                        : null
                                }
                                {
                                    emailStep === 1 ?
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
                                        : null
                                }
                                {
                                    emailStep === 2 ?
                                        <>
                                            <FormGroup>
                                                <FormLabel>Verification Code</FormLabel>
                                                <FormControl type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} />
                                                <small className="text-muted">A verification code was sent to your current email address. Please enter it here.</small>
                                            </FormGroup>
                                            <FormGroup className="mt-2">
                                                <Button type="submit" disabled={loading}>Verify</Button>
                                                <Button variant="secondary" onClick={resetEmail} className="ms-2" type="button" disabled={loading}>Cancel</Button>
                                            </FormGroup>
                                        </>
                                        : null
                                }
                            </Form>
                        </Tab>
                        <Tab eventKey="password" title="Password">
                            <div>
                                <RequestResultAlert errors={passwordMessage.errors} message={passwordMessage.message} />
                                <Button onClick={handleSendPasswordResetEmail} disabled={loading}>Send password reset email</Button>
                            </div>
                        </Tab>
                        <Tab eventKey="avatar" title="Avatar">
                            <div className="mb-2 text-center">
                                <ProfileAvatar avatarImage={userDetails.avatarImage} size={80} />
                            </div>
                            <Form onSubmit={handleAvatarUpload}>
                                <RequestResultAlert errors={avatarMessage.errors} message={avatarMessage.message} />
                                <FormGroup>
                                    <FormControl
                                        size="sm"
                                        type="file"
                                        required
                                        accept="image/png, image/jpeg, image/jpg"
                                        onChange={handleAvatarChange}
                                    />
                                </FormGroup>
                                <div className="d-flex justify-content-end mt-2">
                                    {
                                        userDetails.avatarImage != null &&
                                        <Button size="sm" variant="secondary" disabled={loading} onClick={() => setDeleteModalVisible(true)}>Remove</Button>
                                    }
                                    <Button size="sm" className="ms-2" variant="primary" type="submit" disabled={loading}>Upload</Button>
                                </div>
                            </Form>
                        </Tab>
                        <Tab eventKey="notifications" title="Notifications">
                            <NotificationsTab userId={userInfo?.id || ""} userNotifications={userDetails.notifications} onUpdate={onUserNotificationsUpdate} />
                        </Tab>
                    </Tabs>
                </Modal.Body>
            </Modal>
        </>
    )
}

export default ProfileSettings;