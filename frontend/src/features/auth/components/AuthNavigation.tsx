import { Button, Nav, NavDropdown } from "../../../components/ui";
import { FaQuestion, FaSignOutAlt } from "react-icons/fa";
import { FaGear } from "react-icons/fa6";
import { useApi } from "../../../context/apiCommunication";
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
                                <NavDropdown align="end" title={<> <ProfileAvatar size={32} avatarUrl={userInfo.avatarUrl} /> </>} menuVariant="light">
                                    <NavDropdown.Item as={Link} to="/Profile">
                                        <b className="wb-app-header-user-name">{userInfo.name}</b>
                                        <br />
                                        <span className="text-secondary">Go to profile</span>
                                    </NavDropdown.Item>
                                    <NavDropdown.Divider />
                                    <Link className="dropdown-item" to={"/Profile/" + userInfo.id + "?settings=true"}>
                                        <FaGear /> Settings
                                    </Link>
                                    <Link className="dropdown-item" to={"/Faq"}>
                                        <FaQuestion /> Help
                                    </Link>
                                    <NavDropdown.Item onClick={handleLogout}>
                                        <FaSignOutAlt /> Logout
                                    </NavDropdown.Item>
                                </NavDropdown>
                            </Nav.Item>
                        </>
                        :
                        <>
                            <Nav.Item>
                                <Button to="/Users/Login" size="sm" variant="primary" className="me-2">Log in</Button>
                                <Button to="/Users/Register" size="sm" variant="primary">Register</Button>
                            </Nav.Item>
                        </>
                }
            </Nav>
        </div>
    )
}

export default AuthNavigation;