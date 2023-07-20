import { useNavigate } from "react-router-dom";
import ApiCommunication from "../../helpers/apiCommunication";
import Header from "../../layouts/Header";
import { useAuth } from "./authContext";
import { Button, Container, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap";
import { FormEvent, useState } from "react";

const Login = () => {

    const { authenticate, updateUser } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        await loginUser();
    }

    const loginUser = async () => {
        const data = await ApiCommunication.sendJsonRequest("/Auth/Login", "POST", { email, password });
        if (data && data.accessToken && data.user) {
            authenticate(data.accessToken);
            updateUser(data.user);
            navigate("/Profile");
        }
    }

    return (
        <>
            <Header />
            <Container>
                <Form onSubmit={handleSubmit}>
                    <h2>Login</h2>
                    <FormGroup>
                        <FormLabel>Email</FormLabel>
                        <FormControl type="email" placeholder="Enter email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </FormGroup>
                    <FormGroup>
                        <FormLabel>Password</FormLabel>
                        <FormControl type="password" placeholder="Enter password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                    </FormGroup>
                    <Button className="mt-2" type="submit">Login</Button>
                </Form>
            </Container>
        </>
    );
}

export default Login;