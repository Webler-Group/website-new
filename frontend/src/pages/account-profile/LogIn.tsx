import MenuNavBar from "../../partials/MenuNavBar";
import Footer from "../../partials/Footer";
import PageTitle from "../../partials/PageTitle";

import { SyntheticEvent, useState } from 'react';
import { Alert, Button } from "react-bootstrap";
import { useAuth } from "../../context/AuthContext";


function LogIn() {

    const emailRef = document.getElementById("email") as HTMLInputElement
    const passwordRef = document.getElementById("password") as HTMLInputElement
    const { signin, signWithGoogle, getUserDetails } = useAuth()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();

        try {
            setError("")
            setLoading(true)

            await signin(emailRef.value, passwordRef.value)

            window.location.href = "/member/" + getUserDetails().username;
        } catch(err : any) {
            switch(err.code) {
                case "auth/user-not-found":
                    setError("Email or password does not match")
                    break
                default:
                    setError("Something went wrong")
            }
        }

        setLoading(false)
    }

    async function handleGoogleLogin() {
        try {
            setError("")
            setLoading(true)

            await signWithGoogle()

            window.location.href = "/member/" + getUserDetails().username;
        } catch(err: any) {
            
            switch(err.code) {
                case "auth/popup-closed-by-user":
                    break;
                default:
                    setError("Something went wrong")
            }
        }
        setLoading(false)
    }

    PageTitle("Log in | Webler")

    return (
        <>
            {/* Header */}
            <MenuNavBar pageName={"Login"} />

            {/* Main */}
            <main>
                <div className="d-flex flex-column justify-content-center" >
                    <div className="d-flex justify-content-center">
                        <div  className="w-100 p-4 m-2 rounded" style={{ maxWidth: '600px' , backgroundColor:"var(--authFormBGcolor)"}}>
                            <h3 className="text-center m-2">Log in</h3>
                            {error && <Alert variant="danger">{error}</Alert>}
                            <p className="text-center">Let's get back in to your existing account:</p>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group mb-2">
                                    <label htmlFor="email">Email</label>
                                    <input className="inputTag" type="email" name="email" id="email" placeholder="email address" />
                                </div>
                                <div className="form-group mb-2">
                                    <label htmlFor="password">Password</label>
                                    <input className="inputTag" type="password" name="password" id="password" placeholder="password" />
                                </div>
                                <div className="pt-2" >
                                    <Button disabled={loading} type="submit" className="w-100">Log In</Button>
                                    <a href="/reset-password" className="text-center small">Forgot password?</a>
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
                                    <span>Don't have an account?</span>
                                    <a className="ms-2" href="/signup">Sign up</a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <Footer />
        </>
    );
}

export default LogIn;