import { Nav, NavDropdown, Button } from "react-bootstrap";
import { FaUser, FaQuestion, FaSignOutAlt } from "react-icons/fa";
import { FaGear } from "react-icons/fa6";
import { LinkContainer } from "react-router-bootstrap";
import ApiCommunication from "../../helpers/apiCommunication";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./authContext";

const AuthNavigation = () => {

    const { userInfo, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        ApiCommunication.sendJsonRequest("/Auth/Logout", "POST")
            .then(() => {
                logout();
                navigate("/Login");
            })
    }

    return (
        <Nav>
            {
                (userInfo) ?
                    <>
                        <Nav.Item>
                            <NavDropdown align="end" title={<> <FaUser /> <b>{userInfo.name}</b></>} menuVariant="light">
                                <LinkContainer to="/Profile">
                                    <NavDropdown.Item>
                                        Go to profile
                                    </NavDropdown.Item>
                                </LinkContainer>
                                <NavDropdown.Divider />
                                <NavDropdown.Item>
                                    <FaGear /> Setting
                                </NavDropdown.Item>
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
                            <LinkContainer to="/Login">
                                <Button variant="primary" className="me-2">Log in</Button>
                            </LinkContainer>
                            <LinkContainer to="/Register">
                                <Button variant="primary">Register</Button>
                            </LinkContainer>
                        </Nav.Item>
                    </>
            }
        </Nav>
    )
}

export default AuthNavigation;