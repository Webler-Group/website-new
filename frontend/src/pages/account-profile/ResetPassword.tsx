import PageTitle from "../../partials/PageTitle";

import { SyntheticEvent, useState } from 'react';
import { useAuth } from "../../context/AuthContext";
import { Alert, Button } from "react-bootstrap";

function ResetPassword() {

    const emailRef = document.getElementById("email") as HTMLInputElement;
    const { resetPassword } = useAuth();
    const [error, setError] = useState("")
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: SyntheticEvent) {
        e.preventDefault();

        try {
            setMessage("")
            setError("")
            setLoading(true)
            console.log(emailRef.value);
            
            await resetPassword(emailRef.value)
            setMessage("Check your inbox for further instructions")
          } catch {
            setError("Failed to reset password")
          }
      
          setLoading(false)
    }


    PageTitle("Reset password | Webler")

    return (
        <>
            {/* Main */}
            <div className="d-flex flex-column justify-content-center" style={{ height: "100vh" }}>
                <div className="d-flex justify-content-center">
                    <div className="w-100 p-4 m-2 rounded" style={{ maxWidth: '600px' , backgroundColor: 'var(--authFormBGcolor)'}}>
                        <h3 className="text-center m-2">Password Reset</h3>
                        {error && <Alert variant="danger">{error}</Alert>}
                        {message && <Alert variant="success">{message}</Alert>}
                        <p className="text-center">Forgotten your password? Enter the email address of the Webler account you were last using:</p>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group mb-2">
                                <label htmlFor="email">Email</label>
                                <input className="form-control" type="email" name="email" id="email" placeholder="email address" />
                            </div>
                            <div className="pt-2" >
                                <Button disabled={loading} type="submit" className="w-100">Submit</Button>
                            </div>
                        </form>

                        <div className="mt-4">
                            <p className="text-center small">
                                <span>After clicking Submit, you'll receive instructions on resetting your password.</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ResetPassword;