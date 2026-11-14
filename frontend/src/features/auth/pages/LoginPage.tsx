import { Container } from "../../../components/ui";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import { useSeo } from "../../../components/Seo";

const LoginPage = () => {

    const [searchParams, _] = useSearchParams();
    const navigate = useNavigate();
    useSeo({ title: "Log In", description: "Log in to Webler Codes to continue coding, learning and sharing with the community." });

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