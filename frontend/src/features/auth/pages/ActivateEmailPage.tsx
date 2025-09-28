import { useEffect, useState } from "react";
import { Button, Container } from "react-bootstrap"
import { useNavigate, useSearchParams } from "react-router-dom";
import {useApi} from "../../../context/apiCommunication";

const ActivateEmailPage = () => {
    const [searchParams, _] = useSearchParams();
    const { sendJsonRequest } = useApi();
    const [submitState, setSubmitState] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        activateEmail();
    }, []);

    const activateEmail = async () => {
        const userId = searchParams.get("id");
        const token = searchParams.get("token");
        const result = await sendJsonRequest("/Auth/Activate", "POST", { userId, token });
        if (result) {
            setSubmitState(result.success ? 1 : 2);
        }
    }

    return (
        <>
            <div className="wb-login-wrapper">
                <Container className="wb-login-container">
                    {
                        submitState !== 0 &&
                            submitState === 1 ?
                            <>
                                <h2 className="text-center">Congratulations! Your Webler account is activated.</h2>
                                <p className="text-center">Learn on the go, code in the website, connect with peers and enjoy!</p>
                                <Button className="w-100 d-block mt-2" onClick={() => navigate("/")}>Start coding now</Button>
                            </>
                            :
                            <>
                                <h2 className="text-center">Account activation failed</h2>
                                <p className="text-center">Something went wrong. The link could be expired or corrupt.</p>
                            </>
                    }
                </Container>
            </div>
        </>
    )
}

export default ActivateEmailPage