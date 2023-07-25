import { Link, useNavigate } from "react-router-dom";
import ApiCommunication from "../../../app/apiCommunication";
import { useAuth } from "../context/authContext";
import { Alert, Button, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap";
import { FormEvent, useState } from "react";
import PasswordFormControl from "../../../components/PasswordFormControl";

interface RegisterFormProps {
    onToggleClick: () => void;
}

const RegisterForm = ({ onToggleClick }: RegisterFormProps) => {

    const { authenticate, updateUser } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        setLoading(true);

        await registerUser();

        setLoading(false);
    }

    const registerUser = async () => {
        setError("");
        const result = await ApiCommunication.sendJsonRequest("/Auth/Register", "POST", { email, name, password });
        if (result && result.accessToken && result.user && result.expiresIn) {
            authenticate(result.accessToken, result.expiresIn);
            updateUser(result.user);
            navigate("/Profile");
        }
        else {
            setError(result.message)
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
                <Button className="mt-4 w-100" type="submit" disabled={loading}>Sign up</Button>
            </Form>
            <p className="text-center mt-5">Already have an account? <Button variant="link" onClick={onToggleClick}>Sign in</Button></p>
            <p className="text-center mt-2">By signing up you agree to our <Link to="/Terms-of-use">Terms of Use</Link></p>
        </>
    );
}

export default RegisterForm;