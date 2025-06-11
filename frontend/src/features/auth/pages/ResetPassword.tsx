import { FormEvent, useState } from "react";
import { Alert, Button, Container, Form, FormGroup, FormLabel } from "react-bootstrap"
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {useApi} from "../../../context/apiCommunication";
import PasswordFormControl from "../../../components/PasswordFormControl";
import { useAuth } from "../context/authContext";

const ForgotPassword = () => {
    const [searchParams, _] = useSearchParams();
    const { sendJsonRequest } = useApi();
    const { logout } = useAuth();
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitState, setSubmitState] = useState(0);
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        setLoading(true);

        await resetPassword();

        setLoading(false);
    }

    const resetPassword = async () => {
        setError("");
        const resetId = searchParams.get("id");
        const token = searchParams.get("token");
        const result = await sendJsonRequest("/Auth/ResetPassword", "POST", { password, resetId, token });
        if (result && typeof result.success === "boolean") {
            if (result.success) {
                logout();
            }
            setSubmitState(result.success ? 1 : 2);
        }
        else {
            setError(result.message);
        }
    }

    return (
        <>
            <div className="wb-login-wrapper">
                <Container className="wb-login-container">
                    <h1 className="text-center mb-4">Password Recovery</h1>
                    {
                        submitState !== 0 ?
                            submitState === 1 ?
                                <>
                                    <p className="text-success text-center">Your password has been successfully changed.</p>
                                    <Button className="w-100 d-block mt-2" onClick={() => navigate("/Users/Login")}>Sign in</Button>
                                </>
                                :
                                <>
                                    <p className="text-danger text-center">Something went wrong. The link could be expired or corrupt. <Link to="/Users/Forgot-Password">Try again</Link></p>
                                </>
                            :
                            <>
                                <Form onSubmit={(e) => handleSubmit(e)}>
                                    {error && <Alert variant="danger">{error}</Alert>}
                                    <FormGroup>
                                        <FormLabel>Choose a new password for your account</FormLabel>
                                        <PasswordFormControl password={password} setPassword={setPassword} />
                                    </FormGroup>
                                    <Button className="mt-2 w-100 d-block" type="submit" disabled={loading}>Recover</Button>
                                </Form>
                                <p className="text-end mt-2">
                                    <Link to="/Users/Login">← Sign in</Link>
                                </p>
                            </>
                    }
                </Container>
            </div>
        </>
    )
}

export default ForgotPassword