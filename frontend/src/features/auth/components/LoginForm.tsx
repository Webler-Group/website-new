import { Link } from "react-router-dom";
import {useApi} from "../../../context/apiCommunication";
import { useAuth } from "../context/authContext";
import { Alert, Button, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap";
import { FormEvent, useState } from "react";
import PasswordFormControl from "../../../components/PasswordFormControl";
import WAlert from "../../../components/WAlert";

interface LoginFormProps {
    onToggleClick: () => void;
    onLogin: () => void;
}

const LoginForm = ({ onToggleClick, onLogin }: LoginFormProps) => {
    const { sendJsonRequest } = useApi();
    const { authenticate, updateUser, deviceId } = useAuth();
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
        const result = await sendJsonRequest("/Auth/Login", "POST", { email, password, deviceId });
        if (result && result.accessToken && result.user && result.expiresIn) {
            authenticate(result.accessToken, result.expiresIn);
            updateUser(result.user);
            onLogin();
        }
        else {
            setError(result.message);
        }
    }

    return (
        <section className="bg-white h-screen flex items-center justify-center px-6">
            <div className="w-full max-w-md bg-gray-100 p-8 rounded-2xl shadow">
            <h2 className="text-3xl font-bold text-center mb-6">Sign In</h2>
            {error && <WAlert message={error} variant="danger" />}
            <form className="space-y-4" onSubmit={(e) => handleSubmit(e)}>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500" />
                <div className="flex items-center space-x-2">
                    <Link to="/Users/Forgot-Password">Forgot Password?</Link>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition">Sign In</button>
            </form>
            <p className="text-center mt-5">New to Webler? <Link to="/Users/Register" className="text-blue-900 hover:text-blue-200">Create new account</Link></p>
            </div>
        </section>
    );
}

export default LoginForm;