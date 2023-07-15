import PageTitle from "../layouts/PageTitle";

import 'react-toastify/dist/ReactToastify.css';

import { SyntheticEvent, useRef, useState } from 'react';
import { Alert, Button, Form } from "react-bootstrap";
import { useAuth } from "../features/authentication/AuthContext";


function Reauntheticate({ onAuth, onReturn }: any) {

    const passwordRef = useRef<any>()
    const { reauthWithCredential, reauthWithGoogle, currentUser } = useAuth()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();

        try {
            setError("")
            setLoading(true)

            await reauthWithCredential(passwordRef.current.value)
            onAuth();
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

    async function handleGoogleAuthentication() {
        try {
            setError("")
            setLoading(true)
            await reauthWithGoogle()
            onAuth();
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

    function handleReturn(e: SyntheticEvent) {
        e.preventDefault()

        onReturn();
    }

    PageTitle("Re-authenticate | Webler")

    return (
        <>
            {/* Main */}
            <div className="d-flex flex-column justify-content-center" style={{ height: "100vh" }}>
                <div className="d-flex justify-content-center">
                    <div className="w-100 p-4 m-2 rounded bg-white" style={{ maxWidth: '600px' }}>
                        <h3 className="text-center m-2">Re-authenticate</h3>
                        {error && <Alert variant="danger">{error}</Alert>}
                        <p className="text-center">Login to your account <b>{currentUser.email}</b>:</p>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group mb-2">
                                <label htmlFor="password">Password</label>
                                <Form.Control type="password" name="password" ref={passwordRef} placeholder="password" />
                            </div>
                            <div className="pt-2" >
                                <Button disabled={loading} type="submit" className="w-100">Log In</Button>
                                <a onClick={handleReturn} href="#" className="text-center small">Go back</a>
                            </div>
                        </form>
                        <p className="text-divider">
                            <span>or</span>
                        </p>
                        <div className="row">
                            <div className="col-sm p-2">
                                <button className="btn btn-danger w-100" onClick={handleGoogleAuthentication}>
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

                    </div>
                </div>
            </div>
        </>
    );
}

export default Reauntheticate;