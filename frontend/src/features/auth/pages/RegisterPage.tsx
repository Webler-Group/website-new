import { useNavigate, useSearchParams } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";
import { Container } from "react-bootstrap";
import PageTitle from "../../../layouts/PageTitle";

const RegisterPage = () => {

    const [searchParams, _] = useSearchParams();
    const navigate = useNavigate();
    PageTitle("Webler Codes", false);

    const toggle = () => {
        navigate("/Users/Login" + (searchParams.has("returnUrl") ? `?returnUrl=${searchParams.get("returnUrl")!}` : ""));
    }

    const onRegister = () => {
        navigate(searchParams.has("returnUrl") ? searchParams.get("returnUrl")! : "/Profile");
    }

    return (
        <>

            <div className="wb-login-wrapper">
                <Container className="wb-login-container">
                    <RegisterForm onToggleClick={toggle} onRegister={onRegister} />
                </Container>
            </div>

            {/* <Footer /> */}
        </>
    );
}

export default RegisterPage;