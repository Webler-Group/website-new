import { Link, useNavigate } from "react-router-dom";
import ApiCommunication from "../../../app/apiCommunication";
import { useAuth } from "../context/authContext";
import { Alert, Button, Container, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap";
import { FormEvent, useState } from "react";
import Header from "../../../layouts/Header";
import PasswordFormControl from "../../../components/PasswordFormControl";

const Register = () => {

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
        const data = await ApiCommunication.sendJsonRequest("/Auth/Register", "POST", { email, name, password });
        if (data.accessToken && data.user) {
            authenticate(data.accessToken);
            updateUser(data.user);
            navigate("/Profile");
        }
        else {
            setError(data.message)
        }
    }

    return (
        <>
            <Header />
            <div className="webler-login-wrapper">
                <Container className="webler-login-container">
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
                    <p className="text-center mt-5">Already have an account? <Link to="/Login">Sign in</Link></p>
                    <p className="text-center mt-2">By signing up you agree to our <Link to="/Terms-of-use">Terms of Use</Link></p>
                </Container>
            </div>
        </>
    );
}

export default Register;