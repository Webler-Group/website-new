import { useNavigate } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";
import { Container } from "react-bootstrap";
import PageTitle from "../../../layouts/PageTitle";
import Header from "../../../layouts/Header";
import Footer from "../../../layouts/Footer";

const Register = () => {

    const navigate = useNavigate();
    PageTitle("Webler - Register", false);

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

            {/* <Footer /> */}
        </>
    );
}

export default Register;