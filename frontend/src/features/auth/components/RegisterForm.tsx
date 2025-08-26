import { Link } from "react-router-dom";
import {useApi} from "../../../context/apiCommunication";
import { useAuth } from "../context/authContext";
import { Alert, Button, Form, FormControl, FormGroup, FormLabel } from "react-bootstrap";
import { FormEvent, useEffect, useState } from "react";
import PasswordFormControl from "../../../components/PasswordFormControl";
import WAlert from "../../../components/WAlert";
import WButton, { WTextButton } from "../../../components/WButton";

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
        <section className="bg-white h-screen flex items-center justify-center px-6">
            <div className="w-full max-w-md bg-gray-100 p-8 rounded-2xl shadow">
            <h2 className="text-3xl font-bold text-center mb-6">Sign Up</h2>
            {error && <WAlert message={error} variant="danger" />}
            <form className="space-y-4" onSubmit={(e) => handleSubmit(e)}>
                <input type="text" minLength={3} maxLength={20} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500" />
                <input type="password" placeholder="Password" className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500" />
                <input type="password" placeholder="Confirm Password" className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500" />
                <div className="flex items-center space-x-2">
                    <input type="checkbox" id="terms" className="h-4 w-4 text-red-500" />
                    <label htmlFor="terms" className="text-sm">I accept the <a href="/Terms-of-use" className="text-red-500 underline">Terms of Use</a></label>
                </div>
                <button className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition">Sign Up</button>
            </form>
            <p className="text-center mt-5">Already have an account? <Link to="/Users/Login" className="text-blue-900 hover:text-blue-200">Login</Link> </p>
            </div>
        </section>



        //             <PasswordFormControl password={password} setPassword={setPassword} />
        //         </FormGroup>
        //         <FormGroup>
        //             <FormLabel>Captcha</FormLabel>
        //             <FormControl type="text" required value={solution} onChange={(e) => setSolution(e.target.value)} />
        //             <div className="mt-2 d-flex gap-2">
        //                 <div style={{ height: "50px" }}>
        //                     {imageSrc && <img height="100%" src={imageSrc} />}
        //                 </div>
        //                 <button disabled={captchaId === null} onClick={generateCaptcha} className="d-flex justify-content-center align-items-center" style={{ width: "25px", height: "25px" }} type="button">⟳</button>
        //             </div>
        //         </FormGroup>
        //         <Button className="mt-4 w-100 d-block" type="submit" disabled={loading}>Sign up</Button>
        //     </Form>


//         <div class="relative w-72">
//   <input type="password" id="password" placeholder="Enter password"
//     class="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-red-400 focus:outline-none">
  
//   <!-- Toggle Button -->
//   <button type="button" id="togglePassword" 
//     class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700">
//     <!-- Eye Icon -->
//     <svg id="eyeOpen" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" 
//       stroke-width="2" stroke="currentColor" class="w-6 h-6">
//       <path stroke-linecap="round" stroke-linejoin="round" 
//         d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 
//         2.943 9.542 7-1.274 4.057-5.065 7-9.542 
//         7-4.477 0-8.268-2.943-9.542-7z" />
//       <circle cx="12" cy="12" r="3" />
//     </svg>
//     <!-- Eye Slash Icon (hidden by default) -->
//     <svg id="eyeClosed" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" 
//       stroke-width="2" stroke="currentColor" class="w-6 h-6 hidden">
//       <path stroke-linecap="round" stroke-linejoin="round" 
//         d="M3 3l18 18M9.88 9.88A3 3 0 0112 9c1.657 0 
//         3 1.343 3 3 0 .39-.074.76-.207 
//         1.098M6.23 6.23C4.31 7.67 2.9 
//         9.68 2.458 12c1.274 4.057 5.065 
//         7 9.542 7 1.68 0 3.26-.41 
//         4.65-1.14M17.77 17.77C19.69 
//         16.33 21.1 14.32 21.542 12a10.477 
//         10.477 0 00-4.648-6.86" />
//     </svg>
//   </button>
// </div>

// <script>
//   const passwordInput = document.getElementById("password");
//   const togglePassword = document.getElementById("togglePassword");
//   const eyeOpen = document.getElementById("eyeOpen");
//   const eyeClosed = document.getElementById("eyeClosed");

//   togglePassword.addEventListener("click", () => {
//     const isPassword = passwordInput.type === "password";
//     passwordInput.type = isPassword ? "text" : "password";
//     eyeOpen.classList.toggle("hidden", !isPassword);
//     eyeClosed.classList.toggle("hidden", isPassword);
//   });
// </script>


        // </>
    );
}

export default RegisterForm;