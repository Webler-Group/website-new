import PageTitle from "../layouts/PageTitle";
import { Link } from "react-router-dom";
import { SyntheticEvent, useState } from 'react';
import { useAuth } from "../context/AuthContext";
import { Alert, Button } from "react-bootstrap";
import DatabaseClient from "../api/DatabaseClient";

function SignUp() {

    const emailRef = document.getElementById("email") as HTMLInputElement
    const usernameRef = document.getElementById("username") as HTMLInputElement
    const passwordRef = document.getElementById("password") as HTMLInputElement
    const passwordConfirmationRef = document.getElementById("password-confirmation") as HTMLInputElement
    const { signup, signWithGoogle, getUserDetails } = useAuth()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();

        if(passwordConfirmationRef.value != passwordRef.value) {
            return setError("Passwords do not match")
        }

        let snapshot = await DatabaseClient.getUserByUsername(usernameRef.value);
        if(snapshot.exists()) {
            return setError("Username is used")
        }

        try {
            setError("")
            setLoading(true)
            await signup(emailRef.value, usernameRef.value, passwordRef.value)
            window.location.href = "/member/" + getUserDetails().username;
          } catch(err) {
            console.log(err);
            setError("Failed to create an account")
          }
      
          setLoading(false)
    }

    async function handleGoogleLogin() {
        try {
            setError("")
            setLoading(true)
            await signWithGoogle()
            window.location.href = "/member/" + getUserDetails().username;
        } catch(err) {
            console.log(err);
            setError("Failed to login")
        }
        setLoading(false)
    }



    PageTitle("Sign Up | Webler")

    return (
        <>
            {/* Main */}
            <main>
                <div className="d-flex flex-column justify-content-center" >
                    <div className="d-flex justify-content-center">
                        <div className="w-100 p-4 m-2 rounded" style={{ maxWidth: '600px' , backgroundColor:"var(--authFormBGcolor)"}}>
                            <h3 className="text-center m-2">Sign Up</h3>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <p className="text-center">New here? Let's create your account:</p>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group mb-2">
                                    <label htmlFor="email">Email</label>
                                    <input className="inputTag" type="email" name="email" id="email" placeholder="email address" />
                                </div>
                                <div className="form-group mb-2">
                                    <label htmlFor="username">Username</label>
                                    <input className="inputTag" type="text" name="username" id="username" placeholder="username" />
                                </div>
                                <div className="form-group mb-2">
                                    <label htmlFor="password">Password</label>
                                    <input className="inputTag" type="password" name="password" id="password" placeholder="password" />
                                </div>
                                <div className="form-group mb-2">
                                    <label htmlFor="password-confirmation">Password Confirmation</label>
                                    <input className="inputTag" type="password" name="password-confirmation" id="password-confirmation" placeholder="repeat password" />
                                </div>
                                <div className="pt-2">
                                    <Button disabled={loading} type="submit" className="w-100">Sign up</Button>
                                </div>
                            </form>
                            <p className="text-divider">
                                <span style={{backgroundColor:"var(--authFormBGcolor)"}}>or</span>
                            </p>
                            <div className="row">
                                <div className="col-sm p-2">
                                    <button className="btn btn-danger w-100" onClick={handleGoogleLogin}>
                                        <span className="bg-white me-2 rounded-circle">
                                            <i className="fa fa-google p-1 text-danger"></i>
                                        </span>
                                        <span>Google</span>
                                    </button>
                                </div>
                                <div className="col-sm p-2">
                                    <button className="btn btn-dark w-100">
                                        <span className="bg-white me-2 rounded-circle">
                                            <i className="fa fa-github p-1 text-dark"></i>
                                        </span>
                                        <span>Github</span>
                                    </button>
                                </div>
                                <div className="col-sm p-2">
                                    <button className="btn btn-primary w-100">
                                        <span className="bg-white me-2">
                                            <i className="fa fa-facebook p-1 text-primary"></i>
                                        </span>
                                        <span>Facebook</span>
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-center">
                                    <span>Already have an account?</span>
                                    <Link to="/login" style={{textDecoration:"none"}} className="ms-2">Log in</Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

export default SignUp;