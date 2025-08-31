import { useNavigate, useSearchParams } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import PageTitle from "../../../layouts/PageTitle";

const Login = () => {

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
        <LoginForm onToggleClick={toggle} onLogin={onLogin} />
    );
}

export default Login;