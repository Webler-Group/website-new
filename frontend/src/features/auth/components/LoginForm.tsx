import { Link } from "react-router-dom";
import {useApi} from "../../../context/apiCommunication";
import { useAuth } from "../context/authContext";
import { Button, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap";
import { SubmitEvent, useState } from "react";
import PasswordFormControl from "../../../components/PasswordFormControl";
import RequestResultAlert from "../../../components/RequestResultAlert";
import { LoginData } from "../types";

interface LoginFormProps {
    onToggleClick: () => void;
    onLogin: () => void;
}

const LoginForm = ({ onToggleClick, onLogin }: LoginFormProps) => {
    const { sendJsonRequest } = useApi();
    const { authenticate, updateUser, deviceId } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<{ message: string }[] | undefined>([]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        setLoading(true);

        await loginUser();

        setLoading(false);
    }

    const loginUser = async () => {
        setError([]);
        const result = await sendJsonRequest<LoginData>("/Auth/Login", "POST", { email, password, deviceId });
        if (result?.data) {
            authenticate(result.data.accessToken, result.data.expiresIn);
            updateUser(result.data.user);
            onLogin();
        }
        else {
            setError(result?.error);
        }
    }

    return (
        <>
            <h1 className="text-center mb-4">Sign In</h1>
            <Form onSubmit={(e) => handleSubmit(e)}>
                <RequestResultAlert errors={error} />
                <FormGroup>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <FormControl id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </FormGroup>
                <FormGroup>
                    <FormLabel htmlFor="password">Password</FormLabel>
                    <PasswordFormControl id="password" password={password} setPassword={setPassword} />
                </FormGroup>
                <FormGroup className="d-flex justify-content-end">
                    <Link to="/Users/Forgot-Password">Forgot Password?</Link>
                </FormGroup>
                <Button className="mt-2 w-100 d-block" type="submit" disabled={loading}>Sign in</Button>
            </Form>
            <p className="text-center mt-5">New to Webler? <Button variant="link" onClick={onToggleClick}>Create an account</Button></p>
        </>
    );
}

export default LoginForm;