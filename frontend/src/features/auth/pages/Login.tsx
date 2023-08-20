import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import { Container } from "react-bootstrap";
import PageTitle from "../../../layouts/PageTitle";

const Login = () => {

    const navigate = useNavigate();
    PageTitle("Webler - Login", false);

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

            {/* <Footer /> */}
        </>
    );
}

export default Login;