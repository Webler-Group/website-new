import { Link } from "react-router-dom";
import {useApi} from "../../../context/apiCommunication";
import { useAuth } from "../context/authContext";
import { FormEvent, useEffect, useState } from "react";
import WAlert from "../../../components/WAlert";
import { WEmailField, WPasswordField, WTextField } from "../../../components/FormField";

interface RegisterFormProps {
    onRegister: () => void;
}

const RegisterForm = ({ onRegister }: RegisterFormProps) => {
    const { sendJsonRequest } = useApi();
    const { authenticate, updateUser, deviceId } = useAuth();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [accept_tos, setAccept_tos] = useState(false);    //tos = Terms of use
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [captchaId, setCaptchaId] = useState<string | null>(null);
    const [solution, setSolution] = useState("");

    useEffect(() => {
        generateCaptcha();
    }, []);


    const resetFieldState = () => {
        setPassword("");
        setConfirmPassword("");
        setLoading(false);
        generateCaptcha();
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if(password != confirmPassword) {
            setError("Password does not match");
            resetFieldState();
            return;
        }

        if(!accept_tos) {
            setError("You have not agreed with the Terms of use");
            resetFieldState();
            return;
        }

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
        <section className="bg-white h-screen flex items-center justify-center px-6">
            <div className="w-full max-w-md bg-gray-100 p-8 rounded-2xl shadow">
            <h2 className="text-3xl font-bold text-center mb-6">Sign Up</h2>
            {error && <WAlert message={error} variant="danger" />}
            <form className="space-y-4" onSubmit={(e) => handleSubmit(e)}>
                <WTextField value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={20} placeholder="Name" />
                <WEmailField placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <WPasswordField value={password} onChange={(e) => setPassword(e.target.value)} showVisibility={true} placeholder="Password" />
                <WPasswordField value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} showVisibility={false} placeholder="Confirm Password" />
                <div className="mt-2 flex gap-2">
                    <div style={{ height: "50px" }}>
                        {imageSrc && <img height="100%" src={imageSrc} />}
                    </div>
                    <button disabled={captchaId === null} onClick={generateCaptcha} className="flex justify-content-center center-align" style={{ width: "25px", height: "25px" }} type="button">⟳</button>
                </div>
                <WTextField value={solution} onChange={(e) => setSolution(e.target.value)} minLength={3} maxLength={20} placeholder="Enter Captcha" />
                <div className="flex items-center space-x-2">
                    <input type="checkbox" className="h-4 w-4 text-red-500" onChange = { () => setAccept_tos(!accept_tos) } />
                    <label htmlFor="terms" className="text-sm">I accept the <Link to="/Terms-of-use" className="text-red-500 hover:text-gray-200 underline">Terms of use</Link></label>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition">Sign Up</button>
            </form>
            <p className="text-center mt-5">
                Already have an account? <Link to="/Users/Login" className="text-red-500 hover:text-gray-200 underline">Login</Link> 
            </p>
            </div>
        </section>
    );
}

export default RegisterForm;