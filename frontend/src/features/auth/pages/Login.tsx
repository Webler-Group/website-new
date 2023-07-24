import { Link, useNavigate } from "react-router-dom";
import ApiCommunication from "../../../app/apiCommunication";
import { useAuth } from "../context/authContext";
import { Alert, Button, Container, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap";
import { FormEvent, useState } from "react";
import Header from "../../../layouts/Header";
import PasswordFormControl from "../../../components/PasswordFormControl";

const Login = () => {

    const { authenticate, updateUser } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        setLoading(true);

        await loginUser();

        setLoading(false);
    }

    const loginUser = async () => {
        setError("");
        const data = await ApiCommunication.sendJsonRequest("/Auth/Login", "POST", { email, password });
        if (data.accessToken && data.user) {
            authenticate(data.accessToken);
            updateUser(data.user);
            navigate("/Profile");
        }
        else {
            setError(data.message);
        }
    }

    return (
        <>
            <Header />
            <div className="webler-login-wrapper">
                <Container className="webler-login-container">
                    <h1 className="text-center mb-4">Sign In</h1>
                    <Form onSubmit={(e) => handleSubmit(e)}>
                        <FormGroup>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <FormLabel>Email</FormLabel>
                            <FormControl type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                        </FormGroup>
                        <FormGroup>
                            <FormLabel>Password</FormLabel>
                            <PasswordFormControl password={password} setPassword={setPassword} />
                        </FormGroup>
                        <FormGroup className="d-flex justify-content-end">
                            <Link to="/">Forgot Password?</Link>
                        </FormGroup>
                        <Button className="mt-2 w-100" type="submit" disabled={loading}>Sign in</Button>
                    </Form>
                    <p className="text-center mt-5">New to Webler? <Link to="/Register">Create an account</Link></p>
                </Container>
            </div>
        </>
    );
}

export default Login;