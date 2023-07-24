import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Form, FormControl, FormGroup, FormLabel, Modal, Tab, Tabs } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import countries from "../../../config/countries";
import { UserDetails } from "./Profile";
import ApiCommunication from "../../../app/apiCommunication";
import { useAuth } from "../../auth/context/authContext";
import PasswordFormControl from "../../../components/PasswordFormControl";
import CountryUtils from "../../../utils/countryUtils";

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

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordMessage, setPasswordMessage] = useState([true, ""]);

    useEffect(() => {
        if (userDetails) {
            setUsername(userDetails.name);
            setEmail(userDetails.email);
            setBio(userDetails.bio);
            setCountryCode(userDetails.countryCode);
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
        const data = await ApiCommunication.sendJsonRequest(`/Profile/${userInfo.id}`, "PUT", {
            name: username,
            email,
            bio,
            countryCode
        });
        if (data.success) {
            userInfo.name = data.data.name;
            userInfo.email = data.data.email;
            userInfo.countryCode = data.data.coutryCode;
            updateUser(userInfo);
            onUpdate(data.data);
            setInfoMessage([true, "Information saved successfully"]);
        }
        else {
            if (data.error.code === 11000) {
                setInfoMessage([false, "Email already exists"]);
            }
            else {
                setInfoMessage([false, data.error._message ? data.error._message : "Bad request"])
            }
        }
    }

    const resetInfo = () => {
        if (userDetails) {
            setUsername(userDetails.name);
            setEmail(userDetails.email);
            setBio(userDetails.bio);
            setCountryCode(userDetails.countryCode);
        }
        setInfoMessage([true, ""])
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

    return (
        <Modal show={visible} onHide={onClose} fullscreen="sm-down" centered contentClassName="webler-modal__container edit-profile">
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
                                <FormLabel>Email</FormLabel>
                                <FormControl type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
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
                                                <option key={idx} value={country.code}>{CountryUtils.getCountryString(country)}</option>
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