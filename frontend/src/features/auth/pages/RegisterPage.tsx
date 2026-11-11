import { Container } from "../../../components/ui";
import { useNavigate, useSearchParams } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";
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

            <div className="wb-auth-page-wrapper">
                <Container className="wb-auth-page-container">
                    <RegisterForm onToggleClick={toggle} onRegister={onRegister} />
                </Container>
            </div>

            {/* <Footer /> */}
        </>
    );
}

export default RegisterPage;