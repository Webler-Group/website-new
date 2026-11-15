import { Button, Form, FormControl, FormGroup, FormLabel } from "../../../components/ui";
import { Link } from "react-router-dom";
import {useApi} from "../../../context/apiCommunication";
import { useAuth } from "../context/authContext";
import { SubmitEvent, useState } from "react";
import PasswordFormControl from "../../../components/PasswordFormControl";
import RequestResultAlert from "../../../components/RequestResultAlert";
import { LoginData, LoginSuccessData } from "../types";

interface LoginFormProps {
    onToggleClick: () => void;
    onLogin: () => void;
}

const LoginForm = ({ onToggleClick, onLogin }: LoginFormProps) => {
    const { sendJsonRequest } = useApi();
    const { authenticate, updateUser, deviceId } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const [code, setCode] = useState("");
    const [error, setError] = useState<{ message: string }[] | undefined>([]);
    const [message, setMessage] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        setLoading(true);

        if (verificationId) {
            await verifyLogin();
        } else {
            await loginUser();
        }

        setLoading(false);
    }

    const finishLogin = (data: LoginSuccessData) => {
        authenticate(data.accessToken, data.expiresIn);
        updateUser(data.user);
        onLogin();
    }

    const loginUser = async () => {
        setError([]);
        setMessage(undefined);
        const result = await sendJsonRequest<LoginData>("/Auth/Login", "POST", { email, password, deviceId });
        if (result.data) {
            if (result.data.verificationRequired) {
                setVerificationId(result.data.verificationId);
                setCode("");
                setMessage("We don't recognize this device. A verification code was sent to your email, enter it below to finish signing in.");
            } else {
                finishLogin(result.data);
            }
        }
        else {
            setError(result.error);
        }
    }

    const verifyLogin = async () => {
        setError([]);
        const result = await sendJsonRequest<LoginSuccessData>("/Auth/VerifyLogin", "POST", { verificationId, code: code.trim() });
        if (result.data) {
            finishLogin(result.data);
        }
        else {
            setMessage(undefined);
            setError(result.error);
        }
    }

    const resendCode = async () => {
        setLoading(true);
        await loginUser();
        setLoading(false);
    }

    const cancelVerification = () => {
        setVerificationId(null);
        setCode("");
        setError([]);
        setMessage(undefined);
    }

    if (verificationId) {
        return (
            <>
                <h1 className="text-center mb-4">Verify Sign In</h1>
                <Form onSubmit={(e) => handleSubmit(e)}>
                    <RequestResultAlert errors={error} message={message} />
                    <FormGroup>
                        <FormLabel htmlFor="login-code">Verification Code</FormLabel>
                        <FormControl
                            id="login-code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            required
                            autoFocus
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        />
                        <small className="text-muted">The code is valid for 15 minutes.</small>
                    </FormGroup>
                    <Button className="mt-3 w-100 d-block" type="submit" disabled={loading || code.length !== 6}>Verify</Button>
                    <div className="d-flex justify-content-between mt-3">
                        <Button variant="link" type="button" onClick={cancelVerification} disabled={loading}>Back</Button>
                        <Button variant="link" type="button" onClick={resendCode} disabled={loading}>Resend code</Button>
                    </div>
                </Form>
            </>
        );
    }

    return (
        <>
            <h1 className="text-center mb-4">Sign In</h1>
            <Form onSubmit={(e) => handleSubmit(e)}>
                <RequestResultAlert errors={error} message={message} />
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
