import { useNavigate } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";
import { Container } from "react-bootstrap";

const Register = () => {

    const navigate = useNavigate();

    const toggle = () => {
        navigate("/Login");
    }

    return (
        <>
            <div className="wb-login-wrapper">
                <Container className="wb-login-container">
                    <RegisterForm onToggleClick={toggle} />
                </Container>
            </div>
        </>
    );
}

export default Register;