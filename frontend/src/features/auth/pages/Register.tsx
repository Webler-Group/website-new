import { useNavigate } from "react-router-dom";
import Header from "../../../layouts/Header";
import RegisterForm from "../components/RegisterForm";
import { Container } from "react-bootstrap";

const Register = () => {

    const navigate = useNavigate();

    const toggle = () => {
        navigate("/Login");
    }

    return (
        <>
            <Header />
            <div className="wb-login-wrapper">
                <Container className="wb-login-container">
                    <RegisterForm onToggleClick={toggle} />
                </Container>
            </div>
        </>
    );
}

export default Register;