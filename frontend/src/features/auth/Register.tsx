import { useNavigate } from "react-router-dom";
import ApiCommunication from "../../helpers/apiCommunication";
import Header from "../../layouts/Header";
import { useAuth } from "./authContext";
import { Button, Container, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap";
import { FormEvent, useState } from "react";

const Register = () => {

    const { authenticate, updateUser } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        await registerUser();
    }

    const registerUser = async () => {
        const data = await ApiCommunication.sendJsonRequest("/Auth/Register", "POST", { email, name, password });
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
                    <h2>Register</h2>
                    <FormGroup>
                        <FormLabel>Email</FormLabel>
                        <FormControl type="email" placeholder="Enter email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </FormGroup>
                    <FormGroup>
                        <FormLabel>Name</FormLabel>
                        <FormControl minLength={3} maxLength={20} type="text" placeholder="Enter name" value={name} onChange={(e) => setName(e.target.value)} />
                    </FormGroup>
                    <FormGroup>
                        <FormLabel>Password</FormLabel>
                        <FormControl type="password" minLength={6} placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </FormGroup>
                    <Button type="submit">Register</Button>
                </Form>
            </Container>
        </>
    );
}

export default Register;