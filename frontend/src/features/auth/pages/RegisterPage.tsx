import { Container } from "../../../components/ui";
import { useNavigate, useSearchParams } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";
import { useSeo } from "../../../components/Seo";

const RegisterPage = () => {

    const [searchParams, _] = useSearchParams();
    const navigate = useNavigate();
    useSeo({ title: "Sign Up", description: "Create your free Webler Codes account and join a community of programmers — write code in the browser, take courses, solve challenges and ask questions." });

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