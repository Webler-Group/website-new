import { Container } from "../../../components/ui";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import PageTitle from "../../../layouts/PageTitle";

const LoginPage = () => {

    const [searchParams, _] = useSearchParams();
    const navigate = useNavigate();
    PageTitle("Webler Codes", false);

    const toggle = () => {
        navigate("/Users/Register" + (searchParams.has("returnUrl") ? `?returnUrl=${searchParams.get("returnUrl")!}` : ""));
    }

    const onLogin = () => {
        navigate(searchParams.has("returnUrl") ? searchParams.get("returnUrl")! : "/Profile");
    }

    return (
        <>

            <div className="wb-auth-page-wrapper">
                <Container className="wb-auth-page-container">
                    <LoginForm onToggleClick={toggle} onLogin={onLogin} />
                </Container>
            </div>

            {/* <Footer /> */}
        </>
    );
}

export default LoginPage;