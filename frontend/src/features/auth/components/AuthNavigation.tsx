import { Nav, NavDropdown, Button } from "react-bootstrap";
import { FaQuestion, FaSignOutAlt } from "react-icons/fa";
import { FaGear } from "react-icons/fa6";
import { LinkContainer } from "react-router-bootstrap";
import {useApi} from "../../../context/apiCommunication";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import ProfileAvatar from "../../../components/ProfileAvatar";

const AuthNavigation = () => {
    const { sendJsonRequest } = useApi();
    const { userInfo, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        sendJsonRequest("/Auth/Logout", "POST")
            .then(() => {
                logout();
                navigate("/Users/Login");
            })
    }

    return (
        <div className="d-sm-flex justify-content-center">
            <Nav>
                {
                    (userInfo) ?
                        <>
                            <Nav.Item>
                                <NavDropdown align="end" title={<> <ProfileAvatar size={32} avatarImage={userInfo.avatarImage} /> </>} menuVariant="light">
                                    <LinkContainer to="/Profile">
                                        <NavDropdown.Item>
                                            <b style={{ fontFamily: "monospace" }}>{userInfo.name}</b>
                                            <br />
                                            <span className="text-secondary">Go to profile</span>
                                        </NavDropdown.Item>
                                    </LinkContainer>
                                    <NavDropdown.Divider />
                                    <Link className="dropdown-item" to={"/Profile/" + userInfo.id + "?settings=true"}>
                                        <FaGear /> Settings
                                    </Link>
                                    <NavDropdown.Item>
                                        <FaQuestion /> Help
                                    </NavDropdown.Item>
                                    <NavDropdown.Item onClick={handleLogout}>
                                        <FaSignOutAlt /> Logout
                                    </NavDropdown.Item>
                                </NavDropdown>
                            </Nav.Item>
                        </>
                        :
                        <>
                            <Nav.Item>
                                <LinkContainer to="/Users/Login">
                                    <Button size="sm" variant="primary" className="me-2">Log in</Button>
                                </LinkContainer>
                                <LinkContainer to="/Users/Register">
                                    <Button size="sm" variant="primary">Register</Button>
                                </LinkContainer>
                            </Nav.Item>
                        </>
                }
            </Nav>
        </div>
    )
}

export default AuthNavigation;