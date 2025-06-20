import { FormEvent, useState } from "react";
import { Alert, Button, Container, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap"
import { Link, useNavigate } from "react-router-dom";
import {useApi} from "../../../context/apiCommunication";

const ForgotPassword = () => {
    const { sendJsonRequest } = useApi();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        setLoading(true);

        await sendPasswordResetCode();

        setLoading(false);
    }

    const sendPasswordResetCode = async () => {
        setError("");
        const result = await sendJsonRequest("/Auth/SendPasswordResetCode", "POST", { email });
        if (result && result.success) {
            setIsSubmitted(true);
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
                        isSubmitted ?
                            <>
                                <p className="text-success text-center">We just sent you an email containing further instructions.</p>
                                <Button className="w-100 d-block mt-2" onClick={() => navigate("/")}>Continue exploring</Button>
                            </>
                            :
                            <>
                                <Form onSubmit={(e) => handleSubmit(e)}>
                                    {error && <Alert variant="danger">{error}</Alert>}
                                    <FormGroup>
                                        <FormLabel>Enter your account's email address to recover your password.</FormLabel>
                                        <FormControl type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
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