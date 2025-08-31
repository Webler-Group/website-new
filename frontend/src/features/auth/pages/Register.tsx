import { useNavigate, useSearchParams } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";
import PageTitle from "../../../layouts/PageTitle";

const Register = () => {

    const [searchParams, _] = useSearchParams();
    const navigate = useNavigate();
    PageTitle("Webler Codes", false);

    // const toggle = () => {
    //     navigate("/Users/Login" + (searchParams.has("returnUrl") ? `?returnUrl=${searchParams.get("returnUrl")!}` : ""));
    // }

    const onRegister = () => {
        navigate(searchParams.has("returnUrl") ? searchParams.get("returnUrl")! : "/Profile");
    }

    return (
        <RegisterForm onRegister={onRegister} />
    );
}

export default Register;