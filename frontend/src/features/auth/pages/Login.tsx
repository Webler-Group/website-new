import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import { Container } from "react-bootstrap";

const Login = () => {

    const navigate = useNavigate();

    const toggle = () => {
        navigate("/Register");
    }

    return (
        <>
            <div className="wb-login-wrapper">
                <Container className="wb-login-container">
                    <LoginForm onToggleClick={toggle} />
                </Container>
            </div>
        </>
    );
}

export default Login;