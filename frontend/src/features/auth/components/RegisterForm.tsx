import { Link } from "react-router-dom";
import {useApi} from "../../../context/apiCommunication";
import { useAuth } from "../context/authContext";
import { Alert, Button, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap";
import { FormEvent, useEffect, useState } from "react";
import PasswordFormControl from "../../../components/PasswordFormControl";

interface RegisterFormProps {
    onToggleClick: () => void;
    onRegister: () => void;
}

const RegisterForm = ({ onToggleClick, onRegister }: RegisterFormProps) => {
    const { sendJsonRequest } = useApi();
    const { authenticate, updateUser, deviceId } = useAuth();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [captchaId, setCaptchaId] = useState<string | null>(null);
    const [solution, setSolution] = useState("");

    useEffect(() => {
        generateCaptcha();
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        setLoading(true);

        await registerUser();

        setLoading(false);
    }

    const generateCaptcha = async () => {
        setCaptchaId(null);

        const result = await sendJsonRequest("/Auth/GenerateCaptcha", "POST");

        if (result) {
            setImageSrc(result.imageData);
            setCaptchaId(result.captchaId);
        }
    }

    const registerUser = async () => {
        setError("");
        const result = await sendJsonRequest("/Auth/Register", "POST", { email, name, password, captchaId, solution, deviceId });
        if (result && result.accessToken && result.user && result.expiresIn) {
            authenticate(result.accessToken, result.expiresIn);
            updateUser(result.user);
            onRegister();
        }
        else {
            setError(result.message)
            generateCaptcha()
        }
    }

    return (
        <>
            <h1 className="text-center mb-4">Sign Up</h1>
            <Form onSubmit={(e) => handleSubmit(e)}>
                {error && <Alert variant="danger">{error}</Alert>}
                <FormGroup>
                    <FormLabel>Email</FormLabel>
                    <FormControl type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </FormGroup>
                <FormGroup>
                    <FormLabel>Name</FormLabel>
                    <FormControl type="text" minLength={3} maxLength={20} required value={name} onChange={(e) => setName(e.target.value)} />
                </FormGroup>
                <FormGroup>
                    <FormLabel>Password</FormLabel>
                    <PasswordFormControl password={password} setPassword={setPassword} />
                </FormGroup>
                <FormGroup>
                    <FormLabel>Captcha</FormLabel>
                    <FormControl type="text" required value={solution} onChange={(e) => setSolution(e.target.value)} />
                    <div className="mt-2 d-flex gap-2">
                        <div style={{ height: "50px" }}>
                            {imageSrc && <img height="100%" src={imageSrc} />}
                        </div>
                        <button disabled={captchaId === null} onClick={generateCaptcha} className="d-flex justify-content-center align-items-center" style={{ width: "25px", height: "25px" }} type="button">⟳</button>
                    </div>
                </FormGroup>
                <Button className="mt-4 w-100 d-block" type="submit" disabled={loading}>Sign up</Button>
            </Form>
            <p className="text-center mt-5">Already have an account? <Button variant="link" onClick={onToggleClick}>Sign in</Button></p>
            <p className="text-center mt-2">By signing up you agree to our <Link to="/Terms-of-use">Terms of Use</Link></p>
        </>
    );
}

export default RegisterForm;