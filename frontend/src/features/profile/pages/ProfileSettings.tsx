import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Form, FormControl, FormGroup, FormLabel, Modal, Tab, Tabs } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import countries from "../../../data/countries";
import { UserDetails } from "./Profile";
import ApiCommunication from "../../../helpers/apiCommunication";
import { useAuth } from "../../auth/context/authContext";
import PasswordFormControl from "../../../components/PasswordFormControl";

interface ProfileSettingsProps {
    userDetails: UserDetails;
    onUpdate: (data: any) => void
}

const ProfileSettings = ({ userDetails, onUpdate }: ProfileSettingsProps) => {

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

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordMessage, setPasswordMessage] = useState([true, ""]);

    useEffect(() => {
        if (userDetails) {
            setUsername(userDetails.name || "");
            setEmail(userDetails.email || "");
            setBio(userDetails.bio || "");
            setCountryCode(userDetails.countryCode || "");
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
        const data = await ApiCommunication.sendJsonRequest(`/Profile/UpdateProfile`, "PUT", {
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
        const data = await ApiCommunication.sendJsonRequest(`/Profile/ChangeEmail`, "POST", {
            email,
            password: emailPassword
        });
        if (data.success) {
            userInfo.email = data.data.email;
            updateUser(userInfo);
            setEmailMessage([true, "Email changed successfully"])
        }
        else {
            if (data.error.code === 11000) {
                setEmailMessage([false, "Email already exists"]);
            }
            else {
                setEmailMessage([false, data.error._message ? data.error._message : "Bad request"])
            }
        }
        setEmailStep(0);
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
        const data = await ApiCommunication.sendJsonRequest(`/Profile/ChangePassword`, "POST", {
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
        const validEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

        if (email.match(validEmailRegex)) {
            setEmailStep(1)
            setEmailMessage([true, ""])
        }
        else {
            setEmailMessage([false, "Invalid email"])
        }
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
                    <Tab eventKey="email" title="Email">
                        <Form onSubmit={(e) => handleSubmit(e, changeEmail)}>
                            {emailMessage[1] && <Alert variant={emailMessage[0] ? "success" : "danger"}>{emailMessage[1]}</Alert>}
                            <FormGroup>
                                <FormLabel>{emailStep === 0 ? "Email" : "New Email"}</FormLabel>
                                <FormControl readOnly={emailStep !== 0} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                            </FormGroup>
                            {
                                emailStep === 0 ?
                                    <>
                                        <FormGroup className="mt-2">
                                            <Button onClick={handleEmailNext} type="button">Change</Button>
                                        </FormGroup>
                                    </>
                                    :
                                    <>
                                        <FormGroup>
                                            <FormLabel>Current Password</FormLabel>
                                            <PasswordFormControl password={emailPassword} setPassword={setEmailPassword} />
                                        </FormGroup>
                                        <FormGroup className="mt-2">
                                            <Button type="submit" disabled={loading}>Submit</Button>
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
                    <Tab eventKey="connected-accounts" title="Connected Accounts">
                        Tab content for Connected Accounts
                    </Tab>
                    <Tab eventKey="webler-pro" title="Webler PRO">
                        Tab content for Webler PRO
                    </Tab>
                    <Tab eventKey="delete-account" title="Delete Account">
                        Tab content for Delete Account
                    </Tab>
                </Tabs>
            </Modal.Body>
        </Modal>
    )
}

export default ProfileSettings;